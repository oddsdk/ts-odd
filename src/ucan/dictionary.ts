import * as pathing from "../path.js"
import * as common from "../common/index.js"

import * as token from "./token.js"

import { Resource } from "./types.js"
import { getDictionary } from "./store.js"
import { DistinctivePath } from "../path.js"


// CONSTANTS


// TODO: Waiting on API change.
//       Should be `dnslink`
export const WNFS_PREFIX = "wnfs"



// FUNCTIONS


/**
 * Given a list of UCANs, generate a dictionary.
 * The key will be in the form of `${resourceKey}:${resourceValue}`
 */
export function compile(ucans: Array<string>): Record<string, string> {
  return ucans.reduce((acc, ucanString) => {
    const ucan = token.decode(ucanString)

    if (token.isExpired(ucan)) return acc

    const label = resourceLabel(ucan.payload.rsc)
    return { ...acc, [label]: ucanString }
  }, {})
}

/**
 * Creates the label for a given resource in the UCAN dictionary
 */
export function resourceLabel(rsc: Resource): string {
  if (typeof rsc !== "object") {
    return rsc
  }

  const resource = Array.from(Object.entries(rsc))[0]
  return resource[0] + ":" + (
    resource[0] === WNFS_PREFIX
      ? resource[1].replace(/^\/+/, "")
      : resource[1]
  )
}

/**
 * Lookup the prefix for a filesystem key in the dictionary.
 */
export function filesystemPrefix(username: string): string {
  // const host = `${username}.${setup.endpoints.user}`
  // TODO: Waiting on API change.
  //       Should be `${WNFS_PREFIX}:${host}/`
  return WNFS_PREFIX + ":"
}

/**
 * Look up a UCAN by label
 */
export function lookup(label: string): string | null {
  return getDictionary()[label]
}

/**
 * Look up a UCAN for a platform app.
 */
export async function lookupAppUcan(domain: string): Promise<string | null> {
  const dictionary = getDictionary()
  return dictionary["*"] || dictionary["app:*"] || dictionary[`app:${domain}`]
}

/**
 * Look up a UCAN with a file system path.
 */
export async function lookupFilesystemUcan(path: DistinctivePath | "*"): Promise<string | null> {
  let god

  if (god = lookup("*")) {
    return god
  }

  const all = path === "*"
  const isDirectory = all ? false : pathing.isDirectory(path as DistinctivePath)
  const pathParts = all ? [ "*" ] : pathing.unwrap(path as DistinctivePath)
  const username = await common.authenticatedUsername()
  const prefix = username ? filesystemPrefix(username) : ""

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

      return lookup(`${prefix}${partialPath}`) || null
    },
    null
  )
}
