import localforage from 'localforage'

import * as common from '../common'
import * as pathUtil from '../fs/path'
import * as permissions from './permissions'
import * as ucan from '../ucan'
import { UCANS_STORAGE_KEY } from '../common'
import { Permissions, fileSystemPaths } from './permissions'
import { Ucan, WNFS_PREFIX } from '../ucan'
import { setup } from '../setup/internal'


let dictionary: Record<string, Ucan> = {}


// FUNCTIONS


/**
 * You didn't see anything 👀
 */
export async function clearStorage(): Promise<void> {
  dictionary = {}
  await localforage.removeItem(UCANS_STORAGE_KEY)
}

/**
 * Lookup the prefix for a filesystem key in the dictionary.
 */
export function dictionaryFilesystemPrefix(username: string): string {
  // const host = `${username}.${setup.endpoints.user}`
  // TODO: Waiting on API change.
  //       Should be `${WNFS_PREFIX}:${host}/`
  return WNFS_PREFIX + ":/"
}

/**
 * Look up a UCAN for a platform app.
 */
export async function lookupAppUcan(domain: string): Promise<Ucan | null> {
  return dictionary["*"] || dictionary["app:*"] || dictionary[`app:${domain}`]
}

/**
 * Look up a UCAN with a file system path.
 */
export async function lookupFilesystemUcan(path: string): Promise<Ucan | null> {
  const isDirectory = path.endsWith("/")
  const pathParts = pathUtil.splitParts(path)
  const username = await common.authenticatedUsername()
  const prefix = username ? dictionaryFilesystemPrefix(username) : ""

  if (dictionary["*"]) {
    return dictionary["*"]
  }

  return pathParts.reduce(
    (acc: Ucan | null, part: string, idx: number) => {
      if (acc) return acc
      const partialPath = pathUtil.join(
        pathParts.slice(0, pathParts.length - idx)
      ) + (
        idx + 1 === pathParts.length
          ? (isDirectory ? '/' : '')
          : '/'
      )

      return dictionary[`${prefix}${partialPath}`] || null
    },
    null
  )
}

/**
 * Store UCANs and update the in-memory dictionary.
 */
export async function store(ucans: Array<string>): Promise<void> {
  const existing = await localforage.getItem(UCANS_STORAGE_KEY) as Array<string>
  const newList = (existing || []).concat(ucans)

  dictionary = ucan.compileDictionary(newList)

  const filteredList = listFromDictionary()
  const encodedList = filteredList.map(ucan.encode)

  await localforage.setItem(UCANS_STORAGE_KEY, encodedList)
}

/**
 * See if the stored UCANs in the in-memory dictionary
 * conform to the given `Permissions`.
 */
export function validatePermissions(
  { app, fs }: Permissions,
  username: string
): boolean {
  const prefix = dictionaryFilesystemPrefix(username)

  // Root access
  const rootUcan = dictionary["*"]
  if (rootUcan && !ucan.isExpired(rootUcan)) return true

  // Check permissions
  if (app) {
    const u = dictionary[prefix + permissions.appDataPath(app)]
    if (!u || ucan.isExpired(u)) return false
  }

  if (fs?.private) {
    const priv = fileSystemPaths(fs.private).every(path => {
      const pathWithPrefix = path === '/' ? `${prefix}private/` : `${prefix}private/${path}`
      const u = dictionary[pathWithPrefix]
      return u && !ucan.isExpired(u)
    })
    if (!priv) return false
  }

  if (fs?.public) {
    const publ = fileSystemPaths(fs.public).every(path => {
      const pathWithPrefix = path === '/' ? `${prefix}public/` : `${prefix}public/${path}`
      const u = dictionary[pathWithPrefix]
      return u && !ucan.isExpired(u)
    })
    if (!publ) return false
  }

  return true
}



// ㊙️


function listFromDictionary(): Array<Ucan> {
  return Object.values(dictionary)
}
