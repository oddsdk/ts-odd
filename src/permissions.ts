import * as Path from "./path/index.js"
import { AppInfo } from "./appInfo.js"
import { Distinctive } from "./path/index.js"
import { Potency, Resource } from "./ucan/index.js"


// 🏔


export const ROOT_FILESYSTEM_PERMISSIONS = {
  fs: {
    private: [ Path.root() ],
    public: [ Path.root() ]
  }
}



// 🧩


export type Permissions = {
  app?: AppInfo
  fs?: FileSystemPermissions
  platform?: PlatformPermissions
  raw?: RawPermissions
  sharing?: boolean
}

export type FileSystemPermissions = {
  private?: Array<Distinctive<Path.Segments>>
  public?: Array<Distinctive<Path.Segments>>
}

export type PlatformPermissions = {
  apps: "*" | Array<string>
}

export type RawPermissions = Array<RawPermission>

export type RawPermission = {
  exp: number
  rsc: Resource
  ptc: Potency
}



// 🛠


/**
 * App identifier.
 */
export function appId(app: AppInfo): string {
  return `${app.creator}/${app.name}`
}


/**
 * Lists the file system's paths for a set of `Permissions`.
 * This'll return a list of `DistinctivePath`s.
 */
export function permissionPaths(permissions: Permissions): Distinctive<Path.Partitioned<Path.Partition>>[] {
  let list = [] as Distinctive<Path.Partitioned<Path.Partition>>[]

  if (permissions.app) list.push(Path.appData(permissions.app))
  if (permissions.fs?.private) list = list.concat(
    permissions.fs?.private.map(p => Path.withPartition(
      "private",
      p
    ))
  )
  if (permissions.fs?.public) list = list.concat(
    permissions.fs?.public.map(p => Path.withPartition(
      "public",
      p
    ))
  )

  return list
}