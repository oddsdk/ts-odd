import localforage from 'localforage'

import FileSystem from './fs'
import * as cidLog from './common/cid-log'
import * as debug from './common/debug'
import * as dataRoot from './data-root'
import { authenticatedUsername } from './common'


/**
 * Load a user's file system.
 *
 * @param username Optional, username of the user to load the file system from.
 *                 Will try to load the file system of the authenticated user
 *                 by default. Throws an error if there's no authenticated user.
 */
export async function loadFileSystem(username?: string): Promise<FileSystem> {
  let cid, fs

  // Look for username
  username = username || (await authenticatedUsername() || undefined)
  if (!username) throw new Error("User hasn't authenticated yet")

  // Determine the correct CID of the file system to load
  const dataCid = await dataRoot.lookup(username)
  const [ logIdx, logLength ] = dataCid ? await cidLog.index(dataCid) : [ -1, 0 ]

  if (!dataCid) {
    // No DNS CID yet
    cid = await cidLog.newest()
    debug.log("📓 No DNSLink, using local CID:", cid)

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

  }

  // If a file system exists, load it and return it
  fs = cid ? await FileSystem.fromCID(cid) : null
  if (fs) return fs

  // Otherwise make a new one
  fs = await FileSystem.empty()
  await addSampleData(fs)

  // Fin
  return fs
}



// ㊙️


async function addSampleData(fs: FileSystem): Promise<void> {
  await fs.mkdir("private/Apps")
  await fs.mkdir("private/Audio")
  await fs.mkdir("private/Documents")
  await fs.mkdir("private/Photos")
  await fs.mkdir("private/Video")
}
