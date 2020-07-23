import localforage from 'localforage'

import FileSystem from './fs'
import * as dataRoot from './data-root'
import { FS_CID, FS_TIMESTAMP , authenticatedUsername } from './common'


/**
 * Load a user's file system.
 *
 * @param username Optional, username of the user to load the file system from.
 *                 Will try to load the file system of the authenticated user
 *                 by default. Throws an error if there's no authenticated user.
 */
export async function loadFileSystem(username?: string): Promise<FileSystem> {
  let cid, fs

  // Determine username
  username = username || (await authenticatedUsername() || undefined)
  if (!username) throw new Error("User hasn't authenticated yet")

  const lastLocalChange = await localforage.getItem(FS_TIMESTAMP) as number || 0
  const currentTime = Date.now()

  // If our last file-system change was over 15 minutes ago
  if (currentTime - lastLocalChange > 30 * 60 * 1000) {
    cid = await dataRoot.lookup(username)

  // Otherwise load the cached file-system if possible
  } else {
    cid = await localforage.getItem(FS_CID) as string || await dataRoot.lookup(username)
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
