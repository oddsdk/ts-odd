import * as pathing from '../path'
import { DirectoryPath, DistinctivePath } from '../path'


export type Permissions = {
  app?: AppInfo
  fs?: FileSystemPermissions
  platform?: PlatformPermissions
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
  if (permissions.fs?.private) list = list.concat(permissions.fs?.private)
  if (permissions.fs?.public) list = list.concat(permissions.fs?.public)

  return list
}
