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
  private?: SubFileSystemPermissions
  public?: SubFileSystemPermissions
}

export type SubFileSystemPermissions = {
  directories: Array<string>
  files: Array<string>
}

export type PlatformPermissions = {
  apps: '*' | Array<string>
}


/**
 * Relative path for `AppInfo`.
 */
export function appDataPath(app: AppInfo) {
  return `private/Apps/${app.creator}/${app.name}/`
}


/**
 * Lists the filesystems paths for a set of `Permissions`.
 * This'll return a list of absolute paths.
 *
 *     /private/directory/
 *     /public/file
 */
export function paths(permissions: Permissions): string[] {
  let list = []

  if (permissions.app) list.push('/' + appDataPath(permissions.app))
  if (permissions.fs?.private) list = list.concat(
    fileSystemPaths(permissions.fs?.private).map(p => '/private/' + (p === '/' ? '' : p))
  )

  if (permissions.fs?.public) list = list.concat(
    fileSystemPaths(permissions.fs?.public).map(p => '/public/' + (p === '/' ? '' : p))
  )

  return list
}

/**
 * Lists the filesystems paths for a set of `SubFileSystemPermissions`.
 * This'll return a list of relative paths.
 *
 *     directory/
 *     file
 */
export function fileSystemPaths(permissions: SubFileSystemPermissions): string[] {
  return ([] as string[])
    .concat( (permissions.directories || []).map(p => cleanDirectoryPath(p)) )
    .concat( (permissions.files || []).map(p => cleanFilePath(p)) )
}


// 🛠

/**
 * Properly format a directory path.
 * example/directory/
 */
export function cleanDirectoryPath(path: string): string {
  return cleanFilePath(path).replace(/\/+$/, '') + '/'
}

/**
 * Properly format a file path.
 * example/file
 */
export function cleanFilePath(path: string): string {
  return path.replace(/^\/+/, '')
}
