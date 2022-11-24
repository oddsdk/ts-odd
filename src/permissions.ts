import * as Path from "./path/index.js"
import { DistinctivePath } from "./path/index.js"
import { Potency, Resource } from "./ucan/index.js"


/**
 * Information about your app.
 */
export type AppInfo = {
  name: string
  creator: string
}

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


/**
 * Path for `AppInfo`.
 */
export function appDataPath(app: AppInfo, suffix?: DistinctivePath): DistinctivePath {
  const parent = Path.directory(Path.Branch.Private, "Apps", app.creator, app.name)

  if (suffix) return Path.combine(parent, suffix)
  return parent
}


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

  if (permissions.app) list.push(appDataPath(permissions.app))
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