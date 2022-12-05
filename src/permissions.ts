import * as Path from "./path/index.js"
import { AppInfo } from "./appInfo.js"
import { DistinctivePath } from "./path/index.js"
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
  private?: Array<DistinctivePath>
  public?: Array<DistinctivePath>
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
 * Lists the filesystems paths for a set of `Permissions`.
 * This'll return a list of `DistinctivePath`s.
 */
export function permissionPaths(permissions: Permissions): DistinctivePath[] {
  let list = [] as DistinctivePath[]

  if (permissions.app) list.push(Path.appData(permissions.app))
  if (permissions.fs?.private) list = list.concat(
    permissions.fs?.private.map(p => Path.combine(
      Path.directory(Path.Branch.Private),
      p
    ))
  )
  if (permissions.fs?.public) list = list.concat(
    permissions.fs?.public.map(p => Path.combine(
      Path.directory(Path.Branch.Public),
      p
    ))
  )

  return list
}