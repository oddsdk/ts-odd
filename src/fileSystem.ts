import { CID } from "multiformats/cid"

import type { Cabinet } from "./repositories/cabinet.js"
import type { Repo as CIDLog } from "./repositories/cid-log.js"

import * as Events from "./events.js"
import * as PrivateRef from "./fs/private-ref.js"
import * as Path from "./path/index.js"
import * as Ucan from "./ucan/index.js"

import { Maybe, isString } from "./common/index.js"
import { Account, Agent, Identifier } from "./components.js"
import { AnnexParentType } from "./components/account/implementation.js"
import { Configuration } from "./configuration.js"
import { FileSystem } from "./fs/class.js"
import { Dependencies } from "./fs/types.js"
import { PrivateReference } from "./fs/types/private-ref.js"
import { listFacts } from "./ucan/chain.js"
import { fsReadUcans } from "./ucan/lookup.js"

////////
// 🛠️ //
////////

/**
 * Load a user's file system.
 */
export async function loadFileSystem<Annex extends AnnexParentType>(
  { cabinet, cidLog, config, dependencies, eventEmitter }: {
    cabinet: Cabinet
    cidLog: CIDLog
    config: Configuration
    dependencies: Dependencies<FileSystem> & { account: Account.Implementation<Annex> }
    eventEmitter: Events.Emitter<Events.FileSystem>
  },
): Promise<FileSystem> {
  const { agent, depot, identifier, manners } = dependencies

  let cid: Maybe<CID>
  let fs: FileSystem

  // Determine the correct CID of the file system to load
  const identifierDID = await dependencies.identifier.did()
  const identifierUcans = cabinet.audienceUcans(identifierDID)

  const dataCid = navigator.onLine
    ? await dependencies.account.lookupDataRoot(identifierUcans, cabinet.ucansIndexedByCID)
    : null

  const logIdx = dataCid ? cidLog.indexOf(dataCid) : -1

  if (!navigator.onLine) {
    // Offline, use local CID
    cid = cidLog.newest()
    if (cid) manners.log("📓 Working offline, using local CID:", cid.toString())

    throw new Error("Offline, don't have a file system to work with.")
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
  const did = async () => {
    const identifier = await dependencies.identifier.did()
    const identifierUcans = cabinet.audienceUcans(identifier)

    return dependencies.account.did(identifierUcans, cabinet.ucansIndexedByCID)
  }

  const updateDataRoot = dependencies.account.updateDataRoot

  if (cid) {
    await manners.fileSystem.hooks.beforeLoadExisting(cid, depot)

    fs = await FileSystem.fromCID(cid, { cabinet, cidLog, dependencies, did, eventEmitter, updateDataRoot })

    await manners.fileSystem.hooks.afterLoadExisting(fs, depot)

    const readUcans = fsReadUcans(identifierUcans, identifierDID)
    const facts = readUcans.reduce(
      (acc, readUcan) => ({ ...acc, ...listFacts(readUcan, cabinet.ucansIndexedByCID) }),
      {},
    )

    await Promise.all(
      Object.entries(facts).map(async ([key, ref]) => {
        if (!isString(ref)) throw new Error("Invalid ref")

        const posixPath = key.replace(/wnfs\:\/\/[^\/]+\//, "")
        const path = Path.fromPosix(posixPath)

        return fs.mountPrivateNode({
          path,
          capsuleRef: await PrivateRef.decrypt(ref, agent),
        })
      }),
    )

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
  })

  const maybeMount = await manners.fileSystem.hooks.afterLoadNew(fs, depot)

  // Self delegate file system UCAN
  const fileSystemDelegation = await selfDelegateCapabilities(agent, identifier, maybeMount ? [maybeMount] : [])
  await cabinet.addUcan(fileSystemDelegation)

  // Fin
  return fs
}

/**
 * Create a UCAN that self-delegates the file system capabilities.
 */
export async function selfDelegateCapabilities(
  agent: Agent.Implementation,
  identifier: Identifier.Implementation,
  mounts: {
    path: Path.Distinctive<Path.Segments>
    capsuleRef: PrivateReference
  }[],
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

    facts: await Promise.all(mounts.map(async mount => (
      {
        [`wnfs://${identifierDID}/private/${Path.toPosix(mount.path)}`]: (
          await PrivateRef.encrypt(mount.capsuleRef, agent)
        ),
      }
    ))),
  })
}
