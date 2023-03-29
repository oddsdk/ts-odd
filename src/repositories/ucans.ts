import * as Path from "../path/index.js"
import * as Storage from "../components/storage/implementation"
import * as Ucan from "../ucan/index.js"

import Repository, { RepositoryOptions } from "../repository.js"
import { DistinctivePath } from "../path/index.js"
import { Resource } from "../ucan/index.js"


export function create({ storage }: { storage: Storage.Implementation }): Promise<Repo> {
  return Repo.create({
    storage,
    storageName: storage.KEYS.UCANS
  })
}



// CLASS


export class Repo extends Repository<Ucan.Ucan> {

  private constructor(options: RepositoryOptions) {
    super(options)
  }


  // TODO: Shouldn't be able to add a UCAN that isn't valid


  // ENCODING

  fromJSON(a: string): Ucan.Ucan { return Ucan.decode(a) }
  toJSON(a: Ucan.Ucan): string { return Ucan.encode(a) }

  // `${resourceKey}:${resourceValue}`
  toDictionary(items: Ucan.Ucan[]) {
    return items.reduce(
      (acc, ucan) => ({ ...acc, [ resourceLabel(ucan.payload.rsc) ]: ucan }),
      {}
    )
  }


  // LOOKUPS

  /**
   * Look up a UCAN with a file system path.
   */
  async lookupFileSystemUcan(
    audience: string,
    path: DistinctivePath<Path.Segments> | "*"
  ): Promise<Ucan.Ucan | null> {
    const god = this.getByKey("*")
    if (god && god.payload.aud === audience) return god

    const all = path === "*"
    const isDirectory = all ? false : Path.isDirectory(path)
    const pathParts = all ? [ "*" ] : Path.unwrap(path)

    const prefix = fileSystemPrefix()

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

        const ucan = this.getByKey(`${prefix}${partialPath}`)
        return ucan?.payload.aud === audience ? ucan : null
      },
      null
    )
  }

  /**
   * Look up a UCAN for a platform app.
   */
  async lookupAppUcan(
    // TODO: audience: string,
    domain: string
  ): Promise<Ucan.Ucan | null> {
    return this.getByKey("*") || this.getByKey("app:*") || this.getByKey(`app:${domain}`)
  }

}



// CONSTANTS


// TODO: Waiting on API change.
//       Should be `dnslink`
export const WNFS_PREFIX = "wnfs"



// DICTIONARY


/**
 * Construct the prefix for a file system key.
 */
export function fileSystemPrefix(username?: string): string {
  // const host = `${username}.${setup.endpoints.user}`
  // TODO: Waiting on API change.
  //       Should be `${WNFS_PREFIX}:${host}/`
  return WNFS_PREFIX + ":"
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
