import * as common from '../common'
import * as pathing from '../path'
import * as permissions from './permissions'
import * as storage from '../storage'

import * as ucan from '../ucan'

import { UCANS_STORAGE_KEY } from '../common'
import { DistinctivePath } from '../path'
import { Permissions } from './permissions'
import { WNFS_PREFIX } from '../ucan'


let dictionary: Record<string, string> = {}

// FUNCTIONS

/**
 * Retrieve dictionary
 */
export function getDictionary(): Record<string, string> {
  return dictionary
}

/**
 * You didn't see anything 👀
 */
export async function clearStorage(): Promise<void> {
  dictionary = {}
  await storage.removeItem(UCANS_STORAGE_KEY)
}

/**
 * Lookup the prefix for a filesystem key in the dictionary.
 */
export function dictionaryFilesystemPrefix(username: string): string {
  // const host = `${username}.${setup.endpoints.user}`
  // TODO: Waiting on API change.
  //       Should be `${WNFS_PREFIX}:${host}/`
  return WNFS_PREFIX + ":"
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

      const isLastPart = idx === 0
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
  const existing = await storage.getItem(UCANS_STORAGE_KEY) as Array<string>
  const newList = (existing || []).concat(ucans)

  dictionary = ucan.compileDictionary(newList)

  const filteredList = listFromDictionary()
  await storage.setItem(UCANS_STORAGE_KEY, filteredList)
}

/**
 * See if the stored UCANs in the in-memory dictionary
 * conform to the given `Permissions`.
 */
export function validatePermissions(
  { app, fs, raw }: Permissions,
  username: string
): boolean {
  const prefix = dictionaryFilesystemPrefix(username)

  // Root access
  const rootUcan = dictionary["*"]
  if (rootUcan && !ucan.isExpired(ucan.decode(rootUcan))) return true

  // Check permissions
  if (app) {
    const k = prefix + pathing.toPosix(permissions.appDataPath(app))
    const u = dictionary[k]
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

  if (raw) {
    const hasRaw = raw.every(r => {
      const label = ucan.resourceLabel(r.rsc)
      const u = dictionary[label]
      return u && !ucan.isExpired(ucan.decode(u))
    })
    if(!hasRaw) return false
  }

  return true
}



// ㊙️


function listFromDictionary(): Array<string> {
  return Object.values(dictionary)
}
