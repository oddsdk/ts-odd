import * as pathing from "../path.js"
import * as permissions from "./permissions.js"
import * as storage from "../storage/index.js"

import * as dictionary from "./dictionary.js"
import * as token from "./token.js"
import { getDictionary, setDictionary } from "./store.js"

import { UCANS_STORAGE_KEY } from "../common/index.js"
import { Permissions } from "./permissions.js"



/**
 * Store UCANs and update the in-memory dictionary.
 */
export async function store(ucans: Array<string>): Promise<void> {
  const existing = await storage.getItem(UCANS_STORAGE_KEY) as Array<string>
  const newList = (existing || []).concat(ucans)

  setDictionary(dictionary.compile(newList))

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
  const prefix = dictionary.filesystemPrefix(username)

  // Root access
  const rootUcan = dictionary.lookup("*")
  if (rootUcan && !token.isExpired(token.decode(rootUcan))) return true

  // Check permissions
  if (app) {
    const k = prefix + pathing.toPosix(permissions.appDataPath(app))
    const u = dictionary.lookup(k)
    if (!u || token.isExpired(token.decode(u))) return false
  }

  if (fs?.private) {
    const priv = fs.private.every(path => {
      const pathWithPrefix = `${prefix}private/` + pathing.toPosix(path)
      const u = dictionary.lookup(pathWithPrefix)
      return u && !token.isExpired(token.decode(u))
    })
    if (!priv) return false
  }

  if (fs?.public) {
    const publ = fs.public.every(path => {
      const pathWithPrefix = `${prefix}public/` + pathing.toPosix(path)
      const u = dictionary.lookup(pathWithPrefix)
      return u && !token.isExpired(token.decode(u))
    })
    if (!publ) return false
  }

  if (raw) {
    const hasRaw = raw.every(r => {
      const label = dictionary.resourceLabel(r.rsc)
      const u = dictionary.lookup(label)
      return u && !token.isExpired(token.decode(u))
    })
    if(!hasRaw) return false
  }

  return true
}



// ㊙️


function listFromDictionary(): Array<string> {
  return Object.values(getDictionary())
}
