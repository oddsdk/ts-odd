import * as pathing from '../path'
import { DirectoryPath, DistinctivePath } from '../path'
import { Potency, Resource } from "../ucan"

export type Permissions = {
  app?: AppInfo
  fs?: FileSystemPermissions
  platform?: PlatformPermissions
  raw?: RawPermissions
}

export type AppInfo = {
  name: string
  creator: string
}

export type FileSystemPermissions = {
  private?: Array<DistinctivePath>
  public?: Array<DistinctivePath>
}

export type PlatformPermissions = {
  apps: '*' | Array<string>
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
export function appDataPath(app: AppInfo): DirectoryPath {
  return pathing.directory(pathing.Branch.Private, "Apps", app.creator, app.name)
}


/**
 * Lists the filesystems paths for a set of `Permissions`.
 * This'll return a list of `DistinctivePath`s.
 */
export function paths(permissions: Permissions): DistinctivePath[] {
  let list = [] as DistinctivePath[]

  if (permissions.app) list.push(appDataPath(permissions.app))
  if (permissions.fs?.private) list = list.concat(
    permissions.fs?.private.map(p => pathing.combine(
      pathing.directory(pathing.Branch.Private),
      p
    ))
  )
  if (permissions.fs?.public) list = list.concat(
    permissions.fs?.public.map(p => pathing.combine(
      pathing.directory(pathing.Branch.Public),
      p
    ))
  )

  return list
}
