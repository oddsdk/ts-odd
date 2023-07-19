import { CID } from "multiformats/cid"

import type { Cabinet } from "./repositories/cabinet.js"
import type { Repo as CIDLog } from "./repositories/cid-log.js"

import * as Events from "./events.js"
import * as Path from "./path/index.js"
import * as Ucan from "./ucan/index.js"

import { Maybe } from "./common/index.js"
import { Account, Identifier } from "./components.js"
import { AnnexParentType } from "./components/account/implementation.js"
import { FileSystem } from "./fs/class.js"
import { Dependencies } from "./fs/types.js"

////////
// 🛠️ //
////////

/**
 * Load a user's file system.
 */
export async function loadFileSystem<Annex extends AnnexParentType>(args: {
  cabinet: Cabinet
  cidLog: CIDLog
  dependencies: Dependencies<FileSystem> & { account: Account.Implementation<Annex> }
  did?: string
  eventEmitter: Events.Emitter<Events.FileSystem>
}): Promise<FileSystem> {
  const { cabinet, cidLog, dependencies, eventEmitter } = args
  const { account, depot, identifier, manners } = dependencies

  let cid: Maybe<CID>
  let fs: FileSystem

  // Determine the correct CID of the file system to load
  const identifierDID = await dependencies.identifier.did()
  const identifierUcans = cabinet.audienceUcans(identifierDID)
  const isAuthed = await account.canUpdateDataRoot(identifierUcans, cabinet.ucansIndexedByCID)

  const dataCid = navigator.onLine && isAuthed
    ? await account.lookupDataRoot(identifierUcans, cabinet.ucansIndexedByCID)
    : null

  const logIdx = dataCid ? cidLog.indexOf(dataCid) : -1

  if (!navigator.onLine) {
    // Offline, use local CID
    cid = cidLog.newest()
    if (cid) manners.log("📓 Working offline, using local CID:", cid.toString())
    else manners.log("📓 Working offline, creating a new file system")
  } else if (!isAuthed) {
    // Not authed
    cid = cidLog.newest()
    if (cid) manners.log("📓 Using local CID:", cid.toString())
    else manners.log("📓 Creating a new file system")
  } else if (!dataCid) {
    // No DNS CID yet
    cid = cidLog.newest()
    if (cid) manners.log("📓 No DNSLink, using local CID:", cid.toString())
    else manners.log("📓 Creating a new file system")
  } else if (logIdx === cidLog.length() - 1) {
    // DNS is up to date
    cid = dataCid
    manners.log("📓 DNSLink is up to date:", cid.toString())
  } else if (logIdx !== -1 && logIdx < cidLog.length() - 1) {
    // DNS is outdated
    cid = cidLog.newest()
    const diff = cidLog.length() - 1 - logIdx
    const idxLog = diff === 1 ? "1 newer local entry" : diff.toString() + " newer local entries"
    manners.log("📓 DNSLink is outdated (" + idxLog + "), using local CID:", cid.toString())
  } else {
    // DNS is newer
    cid = dataCid
    await cidLog.add([cid])
    manners.log("📓 DNSLink is newer:", cid.toString())

    // TODO: We could test the filesystem version at this DNSLink at this point to figure out whether to continue locally.
    // However, that needs a plan for reconciling local changes back into the DNSLink, once migrated. And a plan for migrating changes
    // that are only stored locally.
  }

  // If a file system exists, load it and return it
  const did = async (): Promise<string> => {
    return isAuthed
      ? await accountDID({ account, cabinet, identifier })
      : await identifier.did()
  }

  const updateDataRoot = dependencies.account.updateDataRoot

  if (cid) {
    await manners.fileSystem.hooks.beforeLoadExisting(cid, depot)

    fs = await FileSystem.fromCID(
      cid,
      { cabinet, cidLog, dependencies, did, eventEmitter, updateDataRoot, localOnly: !isAuthed }
    )

    // Mount private nodes
    await Promise.all(
      cabinet.accessKeys.map(async a => {
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
    cabinet,
    cidLog,
    dependencies,
    did,
    eventEmitter,
    updateDataRoot,

    localOnly: !isAuthed,
  })

  const maybeMount = await manners.fileSystem.hooks.afterLoadNew(fs, depot)

  // Self delegate file system UCAN & add stuff to cabinet
  const fileSystemDelegation = await selfDelegateCapabilities(identifier)
  await cabinet.addUcan(fileSystemDelegation)
  if (maybeMount) {
    await cabinet.addAccessKey({
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
 * Fetches the account DID.
 */
export async function accountDID<Annex extends AnnexParentType>({ account, cabinet, identifier }: {
  account: Account.Implementation<Annex>
  cabinet: Cabinet
  identifier: Identifier.Implementation
}): Promise<string> {
  const identifierDID = await identifier.did()
  const identifierUcans = cabinet.audienceUcans(identifierDID)
  return account.did(identifierUcans, cabinet.ucansIndexedByCID)
}

/**
 * Create a UCAN that self-delegates the file system capabilities.
 */
export async function selfDelegateCapabilities(
  identifier: Identifier.Implementation
) {
  const identifierDID = await identifier.did()

  return Ucan.build({
    // from & to
    issuer: {
      did: () => identifierDID,
      jwtAlg: await identifier.ucanAlgorithm(),
      sign: identifier.sign,
    },
    audience: identifierDID,

    // capabilities
    capabilities: [
      {
        with: { scheme: "wnfs", hierPart: `//${identifierDID}/` },
        can: { namespace: "fs", segments: ["*"] },
      },
    ],
  })
}
