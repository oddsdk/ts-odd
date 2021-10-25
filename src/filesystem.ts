import FileSystem from "./fs/index.js"

import * as cidLog from "./common/cid-log.js"
import * as debug from "./common/debug.js"
import * as dataRoot from "./data-root.js"
import * as ucan from "./ucan/internal.js"
import * as protocol from "./fs/protocol/index.js"
import * as version from "./fs/version.js"

import { Branch } from "./path.js"
import { Maybe, authenticatedUsername } from "./common/index.js"
import { Permissions } from "./ucan/permissions.js"
import { CID } from "./ipfs/types.js"


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
  let cid, fs

  // Look for username
  username = username || (await authenticatedUsername() || undefined)
  if (!username) throw new Error("User hasn't authenticated yet")

  // Ensure internal UCAN dictionary
  await ucan.store([])

  // Determine the correct CID of the file system to load
  const dataCid = navigator.onLine ? await dataRoot.lookup(username) : null
  const [ logIdx, logLength ] = dataCid ? await cidLog.index(dataCid) : [ -1, 0 ]

  if (!navigator.onLine) {
    // Offline, use local CID
    cid = await cidLog.newest()

  } else if (!dataCid) {
    // No DNS CID yet
    cid = await cidLog.newest()
    if (cid) debug.log("📓 No DNSLink, using local CID:", cid)
    else debug.log("📓 Creating a new file system")

  } else if (logIdx === 0) {
    // DNS is up to date
    cid = dataCid
    debug.log("📓 DNSLink is up to date:", cid)

  } else if (logIdx > 0) {
    // DNS is outdated
    cid = await cidLog.newest()
    const idxLog = logIdx === 1 ? "1 newer local entry" : logIdx + " newer local entries"
    debug.log("📓 DNSLink is outdated (" + idxLog + "), using local CID:", cid)

  } else {
    // DNS is newer
    cid = dataCid
    await cidLog.add(cid)
    debug.log("📓 DNSLink is newer:", cid)

    // TODO: We could test the filesystem version at this DNSLink at this point to figure out whether to continue locally.

  }

  // If a file system exists, load it and return it
  const p = permissions || undefined

  if (cid != null) {
    await checkVersion(cid)
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


export async function checkVersion(filesystemCID: CID): Promise<void> {
  const links = await protocol.basic.getLinks(filesystemCID)
  const versionStr = new TextDecoder().decode(await protocol.basic.getFile(links[Branch.Version].cid))

  if (versionStr !== version.toString(version.latest)) {
    const versionParsed = version.fromString(versionStr)
    
    if (versionParsed == null || version.isSmallerThan(version.latest, versionParsed)) {
      if (globalThis.alert != null) {
        globalThis.alert(`Sorry, we can't sync your filesystem with this app, because your filesystem was upgraded to or created at a newer version. Please let this app's developer know.`)
      }
      throw new Error(`User filesystem version (${versionStr}) doesn't match the supported version (${version.toString(version.latest)}). Please upgrade this app's webnative version.`)
    }

    if (globalThis.alert != null) {
      globalThis.alert(`Sorry, we can't sync your filesystem with this app, because your filesystem version is out-dated and it needs to be migrated. Use the migration app or talk to Fisison support.`)
    }
    throw new Error(`User filesystem version (${versionStr}) doesn't match the supported version (${version.toString(version.latest)}). The user should migrate their filesystem.`)
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
