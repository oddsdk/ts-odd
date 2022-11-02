import { CID } from "multiformats/cid"

import * as Depot from "./components/depot/implementation.js"
import * as Path from "./path/index.js"
import * as Permissions from "./permissions.js"
import * as Reference from "./components/reference/implementation.js"

import * as Protocol from "./fs/protocol/index.js"
import * as Versions from "./fs/versions.js"

import FileSystem, { Dependents } from "./fs/filesystem.js"

import { Branch } from "./path/index.js"
import { Configuration } from "./configuration.js"
import { Maybe, decodeCID } from "./common/index.js"


/**
 * Load a user's file system.
 */
export async function loadFileSystem({ config, dependents, rootKey, username }: {
  config: Configuration,
  dependents: Dependents,
  rootKey?: Uint8Array
  username: string
}): Promise<FileSystem> {
  const { manners, reference } = dependents
  const { permissions } = config

  let cid: Maybe<CID>
  let fs

  // Repositories
  const cidLog = reference.repositories.cidLog

  // Account
  const account = { username, rootDID: await reference.didRoot.lookup(username) }

  // Determine the correct CID of the file system to load
  const dataCid = navigator.onLine ? await getDataRoot(reference, username, { maxRetries: 20 }) : null
  const logIdx = dataCid ? await cidLog.indexOf(dataCid) : -1

  if (!navigator.onLine) {
    // Offline, use local CID
    cid = cidLog.newest()
    if (cid) manners.log("📓 Working offline, using local CID:", cid.toString())

    throw new Error("Offline, don't have a filesystem to work with.")

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
  const p: Permissions.Permissions | undefined = permissions
    ? Permissions.withAppInfo(permissions, config.appInfo)
    : undefined

  if (cid) {
    await checkFileSystemVersion(dependents.depot, config, cid)
    fs = await FileSystem.fromCID(cid, { account, dependents, appInfo: config.appInfo, permissions: p })
    if (fs) return fs
  }

  // Otherwise make a new one
  fs = await FileSystem.empty({
    account,
    dependents,
    rootKey,
    appInfo: config.appInfo,
    permissions: p,
    version: config.filesystem?.version
  })

  await addSampleData(fs)

  // Fin
  return fs
}



// VERSIONING


const DEFAULT_USER_MESSAGES = {
  versionMismatch: {
    newer: async () => alertIfPossible(`Sorry, we can't sync your filesystem with this app. This app only understands older versions of filesystems.\n\nPlease try to hard refresh this site or let this app's developer know.\n\nFeel free to contact Fission support: support@fission.codes`),
    older: async () => alertIfPossible(`Sorry, we can't sync your filesystem with this app. Your filesystem version is out-dated and it needs to be migrated.\n\nRun a migration (https://guide.fission.codes/accounts/account-signup/account-migration) or talk to Fission support: support@fission.codes`),
  }
}


export async function checkFileSystemVersion(
  depot: Depot.Implementation,
  config: Configuration,
  filesystemCID: CID
): Promise<void> {
  const links = await Protocol.basic.getSimpleLinks(depot, filesystemCID)
  // if there's no version link, we assume it's from a 1.0.0-compatible version
  // (from before ~ November 2020)
  const versionStr = links[ Branch.Version ] == null
    ? "1.0.0"
    : new TextDecoder().decode(
      await Protocol.basic.getFile(
        depot,
        decodeCID(links[ Branch.Version ].cid)
      )
    )

  const errorVersionBigger = async () => {
    await (config.userMessages || DEFAULT_USER_MESSAGES).versionMismatch.newer(versionStr)
    return new Error(`Incompatible filesystem version. Version: ${versionStr} Supported versions: ${Versions.supported.map(v => Versions.toString(v)).join(", ")}. Please upgrade this app's webnative version.`)
  }

  const errorVersionSmaller = async () => {
    await (config.userMessages || DEFAULT_USER_MESSAGES).versionMismatch.older(versionStr)
    return new Error(`Incompatible filesystem version. Version: ${versionStr} Supported versions: ${Versions.supported.map(v => Versions.toString(v)).join(", ")}. The user should migrate their filesystem.`)
  }

  const versionParsed = Versions.fromString(versionStr)

  if (versionParsed == null) {
    throw await errorVersionBigger()
  }

  const support = Versions.isSupported(versionParsed)

  if (support === "too-high") {
    throw await errorVersionBigger()
  }
  if (support === "too-low") {
    throw await errorVersionSmaller()
  }
}


function alertIfPossible(str: string) {
  if (globalThis.alert != null) globalThis.alert(str)
}



// ROOT HELPERS


export const ROOT_PERMISSIONS = { fs: { private: [ Path.root() ], public: [ Path.root() ] } }


/**
 * Load a user's root file system.
 */
export const loadRootFileSystem = async (options: {
  config: Configuration,
  dependents: Dependents,
  rootKey?: Uint8Array
  username: string
}): Promise<FileSystem> => {
  const config = { ...options.config, permissions: { ...options.config.permissions, ...ROOT_PERMISSIONS } }
  return await loadFileSystem({ ...options, config })
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


/**
 * Get a user's data root
 *
 * @param username The user's name
 * @param options Optional parameters
 * @param options.maxRetries Maximum number of retry attempts
 * @param options.retryInterval Retry interval in milliseconds
 * @returns data root CID or null
 */
async function getDataRoot(
  reference: Reference.Implementation,
  username: string,
  options: { maxRetries?: number; retryInterval?: number }
    = {}
): Promise<CID | null> {
  const maxRetries = options.maxRetries ?? 0
  const retryInterval = options.retryInterval ?? 500

  let dataCid = await reference.dataRoot.lookup(username)
  if (dataCid) return dataCid

  return new Promise((resolve, reject) => {
    let attempt = 0

    const dataRootInterval = setInterval(async () => {
      dataCid = await reference.dataRoot.lookup(username)

      if (!dataCid && attempt < maxRetries) {
        attempt++
        return
      } else if (attempt >= maxRetries) {
        reject("Failed to load data root")
      }

      clearInterval(dataRootInterval)
      resolve(dataCid)
    }, retryInterval)
  })
}