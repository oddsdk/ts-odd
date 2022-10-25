import { CID } from "multiformats/cid"

import FileSystem from "./fs/index.js"

import * as CIDLog from "./repositories/cid-log.js"
import * as Crypto from "./components/crypto/implementation.js"
import * as Manners from "./components/manners/implementation.js"
import * as Path from "./path/index.js"
import * as Reference from "./components/reference/implementation.js"

import * as protocol from "./fs/protocol/index.js"
import * as versions from "./fs/versions.js"

import { Branch } from "./path/index.js"
import { Maybe, decodeCID } from "./common/index.js"
import { Permissions } from "./permissions.js"


/**
 * Load a user's file system.
 */
export async function loadFileSystem({ crypto, permissions, manners, reference, rootKey, username }: {
  crypto: Crypto.Implementation
  permissions: Maybe<Permissions>
  rootKey?: string
  manners: Manners.Implementation
  reference: Reference.Implementation
  username: string
}): Promise<FileSystem> {
  let cid: Maybe<CID>
  let fs

  // Repositories
  const cidLog = reference.repositories.cidLog

  // Determine the correct CID of the file system to load
  const dataCid = navigator.onLine ? await reference.dataRoot.lookup(username) : null
  const logIdx = dataCid ? await cidLog.indexOf(dataCid) : -1

  if (!navigator.onLine) {
    // Offline, use local CID
    cid = cidLog.newest()
    if (cid) manners.log("📓 Working offline, using local CID:", cid.toString())
    else manners.log("📓 Working offline, creating a new file system")

  } else if (!dataCid) {
    // No DNS CID yet
    cid = cidLog.newest()
    if (cid) manners.log("📓 No DNSLink, using local CID:", cid.toString())
    else manners.log("📓 Creating a new file system")

  } else if (logIdx === 0) {
    // DNS is up to date
    cid = dataCid
    manners.log("📓 DNSLink is up to date:", cid.toString())

  } else if (logIdx > 0) {
    // DNS is outdated
    cid = cidLog.newest()
    const idxLog = logIdx === 1 ? "1 newer local entry" : logIdx + " newer local entries"
    manners.log("📓 DNSLink is outdated (" + idxLog + "), using local CID:", cid.toString())

  } else {
    // DNS is newer
    cid = dataCid
    await cidLog.add(cid)
    manners.log("📓 DNSLink is newer:", cid.toString())

    // TODO: We could test the filesystem version at this DNSLink at this point to figure out whether to continue locally.
    // However, that needs a plan for reconciling local changes back into the DNSLink, once migrated. And a plan for migrating changes
    // that are only stored locally.

  }

  // If a file system exists, load it and return it
  const p = permissions || undefined

  if (cid) {
    await checkFileSystemVersion(cid)
    fs = await FileSystem.fromCID(cid, { permissions: p })
    if (fs) return fs
  }

  // Otherwise make a new one
  fs = await FileSystem.empty({ permissions: p, rootKey })
  await addSampleData(fs)

  // Fin
  return fs
}



// VERSIONING


export async function checkFileSystemVersion(filesystemCID: CID): Promise<void> {
  const links = await protocol.basic.getSimpleLinks(filesystemCID)
  // if there's no version link, we assume it's from a 1.0.0-compatible version
  // (from before ~ November 2020)
  const versionStr = links[ Branch.Version ] == null
    ? "1.0.0"
    : new TextDecoder().decode(
      await protocol.basic.getFile(
        decodeCID(links[ Branch.Version ].cid)
      )
    )

  const errorVersionBigger = async () => {
    await setup.userMessages.versionMismatch.newer(versionStr)
    return new Error(`Incompatible filesystem version. Version: ${versionStr} Supported versions: ${versions.supported.map(v => versions.toString(v)).join(", ")}. Please upgrade this app's webnative version.`)
  }

  const errorVersionSmaller = async () => {
    await setup.userMessages.versionMismatch.older(versionStr)
    return new Error(`Incompatible filesystem version. Version: ${versionStr} Supported versions: ${versions.supported.map(v => versions.toString(v)).join(", ")}. The user should migrate their filesystem.`)
  }

  const versionParsed = versions.fromString(versionStr)

  if (versionParsed == null) {
    throw await errorVersionBigger()
  }

  const support = versions.isSupported(versionParsed)

  if (support === "too-high") {
    throw await errorVersionBigger()
  }
  if (support === "too-low") {
    throw await errorVersionSmaller()
  }
}



// ROOT HELPERS


export const ROOT_PERMISSIONS = { fs: { private: [ Path.root() ], public: [ Path.root() ] } }


/**
 * Load a user's root file system.
 */
export const loadRootFileSystem = async (options: {
  crypto: Crypto.Implementation
  rootKey?: string
  manners: Manners.Implementation
  reference: Reference.Implementation
  username: string
}): Promise<FileSystem> => {
  return await loadFileSystem({ ...options, permissions: ROOT_PERMISSIONS })
}



// ㊙️


async function addSampleData(fs: FileSystem): Promise<void> {
  await fs.mkdir({ directory: [ Branch.Private, "Apps" ] })
  await fs.mkdir({ directory: [ Branch.Private, "Audio" ] })
  await fs.mkdir({ directory: [ Branch.Private, "Documents" ] })
  await fs.mkdir({ directory: [ Branch.Private, "Photos" ] })
  await fs.mkdir({ directory: [ Branch.Private, "Video" ] })
  await fs.publish()
}