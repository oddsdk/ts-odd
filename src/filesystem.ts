import { CID } from "multiformats/cid"

import FileSystem from "./fs/index.js"

import * as cidLog from "./common/cid-log.js"
import * as crypto from "./crypto/index.js"
import * as debug from "./common/debug.js"
import * as dataRoot from "./data-root.js"
import * as did from "./did/index.js"
import * as storage from "./storage/index.js"
import * as token from "./ucan/token.js"
import * as ucan from "./ucan/internal.js"
import * as protocol from "./fs/protocol/index.js"
import * as versions from "./fs/versions.js"

import { Branch } from "./path.js"
import { Maybe, authenticatedUsername, decodeCID } from "./common/index.js"
import { Permissions } from "./ucan/permissions.js"
import { setup } from "./setup/internal.js"


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
  rootKey?: string
): Promise<FileSystem> {
  let cid: Maybe<CID>
  let fs

  // Look for username
  username = username || (await authenticatedUsername() || undefined)
  if (!username) throw new Error("User hasn't authenticated yet")

  // Ensure internal UCAN dictionary
  await ucan.store([])

  // Determine the correct CID of the file system to load
  const dataCid = navigator.onLine ? await dataRoot.lookup(username) : null
  const [ logIdx, logLength ] = dataCid ? await cidLog.index(dataCid.toString()) : [ -1, 0 ]

  if (!navigator.onLine) {
    // Offline, use local CID
    cid = decodeCID(await cidLog.newest())

  } else if (!dataCid) {
    // No DNS CID yet
    cid = decodeCID(await cidLog.newest())
    if (cid) debug.log("📓 No DNSLink, using local CID:", cid.toString())
    else debug.log("📓 Creating a new file system")

  } else if (logIdx === 0) {
    // DNS is up to date
    cid = dataCid
    debug.log("📓 DNSLink is up to date:", cid.toString())

  } else if (logIdx > 0) {
    // DNS is outdated
    cid = decodeCID(await cidLog.newest())
    const idxLog = logIdx === 1 ? "1 newer local entry" : logIdx + " newer local entries"
    debug.log("📓 DNSLink is outdated (" + idxLog + "), using local CID:", cid.toString())

  } else {
    // DNS is newer
    cid = dataCid
    await cidLog.add(cid.toString())
    debug.log("📓 DNSLink is newer:", cid.toString())

    // TODO: We could test the filesystem version at this DNSLink at this point to figure out whether to continue locally.
    // However, that needs a plan for reconciling local changes back into the DNSLink, once migrated. And a plan for migrating changes
    // that are only stored locally.

  }

  // If a file system exists, load it and return it
  const p = permissions || undefined

  if (cid != null) {
    await checkFileSystemVersion(cid)
    fs = await FileSystem.fromCID(cid, { permissions: p })
    if (fs != null) return fs
  }

  // Otherwise make a new one
  if (!rootKey) throw new Error("Can't make new filesystem without a root AES key")
  fs = await FileSystem.empty({ permissions: p, rootKey })
  await addSampleData(fs)

  // Fin
  return fs
}


/**
 * Create a filesystem
 *
 * @param permissions The permissions to initialize the filesystem
 */
export const createFilesystem = async (permissions: Permissions): Promise<FileSystem> => {
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
  await ucan.store([token.encode(fsUcan)])

  // Update filesystem and publish data root
  const rootCid = await fs.publish()

  // Clear the CID log and update it
  await cidLog.clear()
  await cidLog.add(rootCid.toString())

  return fs
}


export async function checkFileSystemVersion(filesystemCID: CID): Promise<void> {
  const links = await protocol.basic.getSimpleLinks(filesystemCID)
  // if there's no version link, we assume it's from a 1.0.0-compatible version
  // (from before ~ November 2020)
  const versionStr = links[Branch.Version] == null
    ? "1.0.0"
    : new TextDecoder().decode(
        await protocol.basic.getFile(
          decodeCID(links[Branch.Version].cid)
        )
      )

  if (versionStr !== versions.toString(versions.latest)) {
    const versionParsed = versions.fromString(versionStr)
    const userMessages = setup.userMessages

    if (versionParsed == null || versions.isSmallerThan(versions.latest, versionParsed)) {
      await userMessages.versionMismatch.newer(versionStr)
      throw new Error(`Incompatible filesystem version. Version: ${versionStr} Supported: ${versions.toString(versions.latest)} Please upgrade this app's webnative version.`)
    }

    await userMessages.versionMismatch.older(versionStr)
    throw new Error(`Incompatible filesystem version. Version: ${versionStr} Supported: (${versions.toString(versions.latest)} The user should migrate their filesystem.`)
  }
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
  const maybeReadKey = await storage.getItem("readKey") as unknown as string
  if (maybeReadKey) return maybeReadKey

  const readKey = await crypto.aes.genKeyStr()
  await storage.setItem("readKey", readKey)
  return readKey
}