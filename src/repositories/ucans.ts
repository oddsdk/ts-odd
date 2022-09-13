import * as Path from "../path/index.js"
import * as Storage from "../components/storage/implementation"
import * as Ucan from "../ucan/index.js"

import Repository from "../repository"
import { DistinctivePath } from "../path/index.js"
import { Resource } from "../ucan/index.js"


export function create({ storage }: { storage: Storage.Implementation }): Repository<Ucan.Ucan> {
  const repo = new Repository({
    storage,
    storageName: storage.KEYS.UCANS
  }) as Repository<Ucan.Ucan> // TODO: Can I remove this `as` statement somehow?

  repo.fromJSON = Ucan.decode
  repo.toJSON = Ucan.encode

  // `${resourceKey}:${resourceValue}`
  repo.toDictionary = (items) => items.reduce(
    (acc, ucan) => ({ ...acc, [ resourceLabel(ucan.payload.rsc) ]: ucan }),
    {}
  )

  return repo
}


// CONSTANTS


// TODO: Waiting on API change.
//       Should be `dnslink`
export const WNFS_PREFIX = "wnfs"



// DICTIONARY


/**
 * Construct the prefix for a filesystem key.
 */
export function filesystemPrefix(username?: string): string {
  // const host = `${username}.${setup.endpoints.user}`
  // TODO: Waiting on API change.
  //       Should be `${WNFS_PREFIX}:${host}/`
  return WNFS_PREFIX + ":"
}

/**
 * Look up a UCAN for a platform app.
 */
export async function lookupAppUcan(
  repo: Repository<Ucan.Ucan>,
  domain: string
): Promise<Ucan.Ucan | null> {
  return repo.getByKey("*") || repo.getByKey("app:*") || repo.getByKey(`app:${domain}`)
}

/**
 * Look up a UCAN with a file system path.
 */
export async function lookupFilesystemUcan(
  repo: Repository<Ucan.Ucan>,
  path: DistinctivePath | "*"
): Promise<Ucan.Ucan | null> {
  const god = repo.getByKey("*")
  if (god) return god

  const all = path === "*"
  const isDirectory = all ? false : Path.isDirectory(path as DistinctivePath)
  const pathParts = all ? [ "*" ] : Path.unwrap(path as DistinctivePath)

  const prefix = filesystemPrefix()

  return pathParts.reduce(
    (acc: Ucan.Ucan | null, part: string, idx: number) => {
      if (acc) return acc

      const isLastPart = idx === 0
      const partsSlice = pathParts.slice(0, pathParts.length - idx)

      const partialPath = Path.toPosix(
        isLastPart && !isDirectory
          ? Path.file(...partsSlice)
          : Path.directory(...partsSlice)
      )

      return repo.getByKey(`${prefix}${partialPath}`) || null
    },
    null
  )
}

/**
 * Creates the label for a given resource.
 */
export function resourceLabel(rsc: Resource): string {
  if (typeof rsc !== "object") {
    return rsc
  }

  const resource = Array.from(Object.entries(rsc))[ 0 ]
  return resource[ 0 ] + ":" + (
    resource[ 0 ] === WNFS_PREFIX
      ? resource[ 1 ].replace(/^\/+/, "")
      : resource[ 1 ]
  )
}
