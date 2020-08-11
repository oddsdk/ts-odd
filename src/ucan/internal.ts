import localforage from 'localforage'

import * as common from '../common'
import * as pathUtil from '../fs/path'
import * as ucan from '../ucan'
import { UCANS_STORAGE_KEY } from '../common'
import { Prerequisites } from './prerequisites'
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
 * Look up a UCAN with a file system path.
 */
export async function lookupFilesystemUcan(path: string): Promise<Ucan | null> {
  const pathParts = pathUtil.splitParts(path)
  const username = await common.authenticatedUsername()
  const prefix = username ? dictionaryFilesystemPrefix(username) : ""

  if (dictionary["*"]) {
    return dictionary["*"]
  }

  return pathParts.reduce(
    (acc: Ucan | null, part: string, idx: number) => {
      if (acc) return acc
      const partialPath = pathUtil.join(pathParts.slice(0, pathParts.length - idx))
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
 * conform to the given `Prerequisites`.
 */
export function validatePrerequisites(
  { app, fs }: Prerequisites,
  username: string
): boolean {
  const prefix = dictionaryFilesystemPrefix(username)

  // Root access
  const rootUcan = dictionary["*"]
  if (rootUcan && !ucan.isExpired(rootUcan)) return true

  // Check prerequisites
  if (app) {
    const u = dictionary[`${prefix}private/Apps/${app.creator}/${app.name}`]
    if (!u || ucan.isExpired(u)) return false
  }

  if (fs && fs.privatePaths) {
    const priv = fs.privatePaths.every(pathRaw => {
      const path = pathRaw.replace(/^\/+/, "")
      const pathWithPrefix = path.length ? `${prefix}private/${path}` : `${prefix}private`
      const u = dictionary[pathWithPrefix]
      return u && !ucan.isExpired(u)
    })
    if (!priv) return false
  }

  if (fs && fs.publicPaths) {
    const publ = fs.publicPaths.every(pathRaw => {
      const path = pathRaw.replace(/^\/+/, "")
      const pathWithPrefix = path.length ? `${prefix}public/${path}` : `${prefix}public`
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
