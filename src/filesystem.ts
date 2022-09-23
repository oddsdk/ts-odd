import { CID } from "multiformats/cid"

import FileSystem from "./fs/index.js"

import * as cidLog from "./common/cid-log.js"
import * as common from "./common/index.js"
import * as crypto from "./crypto/index.js"
import * as debug from "./common/debug.js"
import * as dataRoot from "./data-root.js"
import * as did from "./did/index.js"
import * as pathing from "./path.js"
import * as protocol from "./fs/protocol/index.js"
import * as storage from "./storage/index.js"
import * as token from "./ucan/token.js"
import * as ucan from "./ucan/internal.js"
import * as versions from "./fs/versions.js"

import { Branch } from "./path.js"
import { Maybe, authenticatedUsername, decodeCID } from "./common/index.js"
import { Permissions } from "./ucan/permissions.js"
import { setup } from "./setup/internal.js"



// LOAD


/**
 * Load a user's file system.
 *
 * @param permissions The permissions from initialise.
 *                    Pass `null` if working without permissions
 * @param username Optional, username of the user to load the file system from.
 *                 Will try to load the file system of the authenticated user
 *                 by default. Throws an error if there's no authenticated user.
 * @param rootKey Optional, AES key to be the root key of a new filesystem.
 *                Will be used if a filesystem hasn't been created yet.
 */
export async function loadFileSystem(
  permissions: Maybe<Permissions>,
  username?: string,
): Promise<FileSystem> {
  let fs: FileSystem | null = null

  // Look for username
  username = username || (await authenticatedUsername() || undefined)
  if (!username) throw new Error("User hasn't authenticated yet")

  // Ensure internal UCAN dictionary
  await ucan.store([])

  // Get latest log CID
  const logCid = await getLogCid()

  // Offline
  if (!navigator.onLine) {
    if (logCid) {
      // Load from log CID
      fs = await loadFromCid(logCid, permissions)

    } else {
      // Might come online, poll for data root
      const dataRoot = await getDataRoot(username, { maxRetries: 20 })

      if (dataRoot) {
        fs = await loadFromCid(dataRoot, permissions)
        await cidLog.add(dataRoot.toString())
      }
    }

    if (fs) return fs
    throw new Error("Could not load filesystem from local CID or DNSLink")
  }

  // Online, try for data root once
  let dataRoot = await getDataRoot(username)

  if (logCid && dataRoot) {
    const [ logIdx, logLength ] = dataRoot ? await cidLog.index(dataRoot.toString()) : [ -1, 0 ]

    if (logIdx === 0) {
      // DNS is up to date
      fs = await loadFromCid(dataRoot, permissions)
      debug.log("📓 DNSLink is up to date:", dataRoot.toString())

    } else if (logIdx > 0) {
      // DNS is outdated
      fs = await loadFromCid(logCid, permissions)
      const idxLog = logIdx === 1 ? "1 newer local entry" : logIdx + " newer local entries"
      debug.log("📓 DNSLink is outdated (" + idxLog + "), using local CID:", logCid.toString())

    } else {
      // DNS is newer
      fs = await loadFromCid(dataRoot, permissions)
      await cidLog.add(dataRoot.toString())
      debug.log("📓 DNSLink is newer:", dataRoot.toString())

      // TODO: We could test the filesystem version at this DNSLink at this point to figure out whether to continue locally.
      // However, that needs a plan for reconciling local changes back into the DNSLink, once migrated. And a plan for migrating changes
      // that are only stored locally.

    }

    return fs
  } else if (dataRoot) {
    // No log CID, use data root
    fs = await loadFromCid(dataRoot, permissions)
    await cidLog.add(dataRoot.toString())

  } else {
    // Poll more aggressively for data root
    dataRoot = await getDataRoot(username, { maxRetries: 20 })

    if (dataRoot) {
      fs = await loadFromCid(dataRoot, permissions)
      await cidLog.add(dataRoot.toString())
    } else {
      throw new Error("Could not load filesystem from DNSLink")
    }

  }

  // Fin
  return fs
}

/**
 * Get the latest cidLog entry
 *  
 * @returns latest cidLog entry or null
 */
const getLogCid = async (): Promise<CID | null> => {
  const encodedCid = await cidLog.newest()
  return encodedCid ? decodeCID(encodedCid) : null
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
const getDataRoot = async (
  username: string,
  options: { maxRetries?: number; retryInterval?: number }
    = {}
): Promise<CID | null> => {
  const maxRetries = options.maxRetries ?? 0
  const retryInterval = options.retryInterval ?? 500

  let dataCid = await dataRoot.lookup(username)

  if (dataCid) return dataCid

  return new Promise((resolve) => {
    let attempt = 0

    const dataRootInterval = setInterval(async () => {
      dataCid = await dataRoot.lookup(username)

      if (!dataCid && attempt < maxRetries) {
        attempt++
        return
      }

      clearInterval(dataRootInterval)
      resolve(dataCid)
    }, retryInterval)
  })
}

/**
 * Load a filesystem from a CID
 *  
 * @param cid The CID to load from
 * @param permissions Permissions to access the filesystem
 * @returns 
 */
const loadFromCid = async (cid: CID, permissions: Maybe<Permissions>): Promise<FileSystem> => {
  const p = permissions || undefined

  await checkFileSystemVersion(cid)
  return await FileSystem.fromCID(cid, { permissions: p })
}



// CREATE


/**
 * Create a new filesystem and assign it to a user.
 *
 * @param permissions The permissions to initialize the filesystem
 * @param options Optional params
 * @param options.reset Override an existing filesystem with an empty one
 */
export const bootstrapFileSystem = async (
  permissions: Permissions,
  options: { reset?: boolean } = { reset: false }
): Promise<FileSystem> => {
  const { reset } = options
  const authedUsername = await common.authenticatedUsername()

  // Check for authed user and existing filesystem
  if (authedUsername) {
    if (!reset) {
      const dataCid = navigator.onLine ? await dataRoot.lookup(authedUsername) : null // data root on server or DNS
      const logCid = await cidLog.newest() // data root in browser

      if (dataCid !== null || logCid !== undefined) {
        throw new Error("Bootstrap operation will \"reset\" an existing filesystem. Please set reset to true if this behavior is desired.")
      }
    }

  } else {
    throw new Error("Cannot bootstrap filesystem because an authed user could not be found.")
  }

  // Get or create root read key
  const rootKey = await readKey()

  // Create an empty filesystem
  const fs = await FileSystem.empty({ permissions, rootKey })

  // Self-authorize a filesystem UCAN
  const issuer = await did.write()
  const proof: string | null = await storage.getItem("ucan")
  const fsUcan = await token.build({
    potency: "APPEND",
    resource: "*",
    proof: proof ? proof : undefined,
    lifetimeInSeconds: 60 * 60 * 24 * 30 * 12 * 1000, // 1000 years

    audience: issuer,
    issuer
  })

  // Add filesystem UCAN to store
  await ucan.store([ token.encode(fsUcan) ])

  // Update filesystem and publish data root
  const rootCid = await fs.publish()

  // Clear the CID log and update it
  await cidLog.clear()
  await cidLog.add(rootCid.toString())

  return fs
}



// VERSION


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


const ROOT_PERMISSIONS = { fs: { private: [ pathing.root() ], public: [ pathing.root() ] } }

/**
 * Load a user's root file system.
 */
export const loadRootFileSystem = async (): Promise<FileSystem> => {
  return await loadFileSystem(ROOT_PERMISSIONS)
}

/**
 * Create a new filesystem with public and private roots and assign it to a user.
 *
 * @param options Optional params
 * @param options.reset Override an existing filesystem with an empty one
 */
export const bootstrapRootFileSystem = async (
  options: { reset?: boolean } = { reset: false }
): Promise<FileSystem> => {
  return await bootstrapFileSystem(ROOT_PERMISSIONS, options)
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



// 🔑


/**
 * Create or get a read key for accessing the WNFS private root.
 */
export async function readKey(): Promise<string> {
  const maybeReadKey: string | null = await storage.getItem("readKey")
  if (maybeReadKey) return maybeReadKey

  const readKey = await crypto.aes.genKeyStr()
  await storage.setItem("readKey", readKey)
  return readKey
}