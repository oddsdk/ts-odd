import { CID } from "multiformats/cid"

import type { Cabinet } from "./repositories/cabinet.js"

import * as Path from "./path/index.js"
import * as CIDLog from "./repositories/cid-log.js"
import * as Ucan from "./ucan/index.js"

import { Maybe } from "./common/index.js"
import { Identifier, Storage } from "./components.js"
import { FileSystem } from "./fs/class.js"
import { Dependencies } from "./fs/types.js"
import { Dictionary } from "./ucan/dictionary.js"

////////
// 🛠️ //
////////

/**
 * Load a user's file system.
 */
export async function loadFileSystem(args: {
  cabinet: Cabinet
  dataRoot?: CID
  dataRootUpdater?: (
    dataRoot: CID,
    proofs: Ucan.Ucan[]
  ) => Promise<{ updated: true } | { updated: false; reason: string }>
  dependencies: Dependencies<FileSystem> & {
    identifier: Identifier.Implementation
    storage: Storage.Implementation
  }
  did: string
}): Promise<FileSystem> {
  const { cabinet, dataRootUpdater, dependencies, did } = args
  const { depot, identifier, manners, storage } = dependencies

  let cid: Maybe<CID> = args.dataRoot || null
  let fs: FileSystem

  // Create CIDLog, namespaced by identifier
  const cidLog = await CIDLog.create({ storage, did })

  // Determine the correct CID of the file system to load
  const logIdx = cid ? cidLog.indexOf(cid) : -1

  if (!cid) {
    // No DNS CID yet
    cid = cidLog.newest()
    if (cid) manners.log("📓 Using local CID:", cid.toString())
    else manners.log("📓 Creating a new file system")
  } else if (logIdx === cidLog.length() - 1) {
    // DNS is up to date
    manners.log("📓 DNSLink is up to date:", cid.toString())
  } else if (logIdx !== -1 && logIdx < cidLog.length() - 1) {
    // DNS is outdated
    cid = cidLog.newest()
    const diff = cidLog.length() - 1 - logIdx
    const idxLog = diff === 1 ? "1 newer local entry" : diff.toString() + " newer local entries"
    manners.log("📓 DNSLink is outdated (" + idxLog + "), using local CID:", cid.toString())
  } else {
    // DNS is newer
    await cidLog.add([cid])
    manners.log("📓 DNSLink is newer:", cid.toString())

    // TODO: We could test the filesystem version at this DNSLink at this point to figure out whether to continue locally.
    // However, that needs a plan for reconciling local changes back into the DNSLink, once migrated. And a plan for migrating changes
    // that are only stored locally.
  }

  // If a file system exists, load it and return it
  const ucanDictionary = new Dictionary(cabinet)
  const updateDataRoot = dataRootUpdater

  if (cid) {
    await manners.fileSystem.hooks.beforeLoadExisting(cid, depot)

    fs = await FileSystem.fromCID(
      cid,
      { cidLog, dependencies, did, ucanDictionary, updateDataRoot }
    )

    // Mount private nodes
    await Promise.all(
      (cabinet.accessKeys[fs.did] || []).map(async a => {
        return fs.mountPrivateNode({
          path: Path.removePartition(a.path),
          capsuleRef: a.key,
        })
      })
    )

    await manners.fileSystem.hooks.afterLoadExisting(fs, depot)

    return fs
  }

  // Otherwise make a new one
  await manners.fileSystem.hooks.beforeLoadNew(depot)

  fs = await FileSystem.empty({
    cidLog,
    dependencies,
    did,
    ucanDictionary,
    updateDataRoot,
  })

  const maybeMount = await manners.fileSystem.hooks.afterLoadNew(fs, depot)

  // Self delegate file system UCAN & add stuff to cabinet
  const fileSystemDelegation = await selfDelegateCapabilities(identifier, fs.did)
  await cabinet.addUcan(fileSystemDelegation)
  if (maybeMount) {
    await cabinet.addAccessKey({
      did: fs.did,
      key: maybeMount.capsuleRef,
      path: Path.combine(Path.directory("private"), maybeMount.path),
    })
  }

  // Add initial CID to log
  await cidLog.add([
    await fs.calculateDataRoot(),
  ])

  // Fin
  return fs
}

/**
 * Create a UCAN that self-delegates the file system capabilities.
 */
export async function selfDelegateCapabilities(
  identifier: Identifier.Implementation,
  audience: string
) {
  const identifierDID = await identifier.did()

  return Ucan.build({
    // from & to
    issuer: {
      did: () => identifierDID,
      jwtAlg: await identifier.ucanAlgorithm(),
      sign: identifier.sign,
    },
    audience,

    // capabilities
    capabilities: [
      {
        with: { scheme: "wnfs", hierPart: `//${identifierDID}/` },
        can: { namespace: "fs", segments: ["*"] },
      },
    ],
  })
}
