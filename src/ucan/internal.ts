import localforage from 'localforage'

import * as common from '../common'
import * as pathing from '../path'
import * as permissions from './permissions'
import * as ucan from '../ucan'

import { UCANS_STORAGE_KEY } from '../common'
import { DistinctivePath } from '../path'
import { Permissions } from './permissions'
import { Ucan, WNFS_PREFIX } from '../ucan'
import { setup } from '../setup/internal'


let dictionary: Record<string, string> = {}


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
export async function lookupAppUcan(domain: string): Promise<string | null> {
  return dictionary["*"] || dictionary["app:*"] || dictionary[`app:${domain}`]
}

/**
 * Look up a UCAN with a file system path.
 */
export async function lookupFilesystemUcan(path: DistinctivePath | "*"): Promise<string | null> {
  if (dictionary["*"]) {
    return dictionary["*"]
  }

  const all = path === "*"
  const isDirectory = all ? false : pathing.isDirectory(path as DistinctivePath)
  const pathParts = all ? [ "*" ] : pathing.unwrap(path as DistinctivePath)
  const username = await common.authenticatedUsername()
  const prefix = username ? dictionaryFilesystemPrefix(username) : ""

  return pathParts.reduce(
    (acc: string | null, part: string, idx: number) => {
      if (acc) return acc

      const isLastPart = (idx + 1 === pathParts.length)
      const partsSlice = pathParts.slice(0, pathParts.length - idx)

      const partialPath = pathing.toPosix(
        isLastPart && !isDirectory
          ? pathing.file(...partsSlice)
          : pathing.directory(...partsSlice)
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
  await localforage.setItem(UCANS_STORAGE_KEY, filteredList)
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
  if (rootUcan && !ucan.isExpired(ucan.decode(rootUcan))) return true

  // Check permissions
  if (app) {
    const u = dictionary[prefix + permissions.appDataPath(app)]
    if (!u || ucan.isExpired(ucan.decode(u))) return false
  }

  if (fs?.private) {
    const priv = fs.private.every(path => {
      const pathWithPrefix = `${prefix}private/` + pathing.toPosix(path)
      const u = dictionary[pathWithPrefix]
      return u && !ucan.isExpired(ucan.decode(u))
    })
    if (!priv) return false
  }

  if (fs?.public) {
    const publ = fs.public.every(path => {
      const pathWithPrefix = `${prefix}public/` + pathing.toPosix(path)
      const u = dictionary[pathWithPrefix]
      return u && !ucan.isExpired(ucan.decode(u))
    })
    if (!publ) return false
  }

  return true
}



// ㊙️


function listFromDictionary(): Array<string> {
  return Object.values(dictionary)
}
