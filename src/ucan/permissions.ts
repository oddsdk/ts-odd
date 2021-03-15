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
  privatePaths: Array<string>
  publicPaths: Array<string>
}

export type PlatformPermissions = {
  app: '*' | string
}


export function appDataPath(app: AppInfo) {
  return `private/Apps/${app.creator}/${app.name}`
}


export function paths(permissions: Permissions): string[] {
  let list = []

  if (permissions.app) list.push('/' + appDataPath(permissions.app))
  if (permissions.fs && permissions.fs.privatePaths) list = list.concat(
    permissions.fs.privatePaths
      .map(p => '/private/' + p.replace(/^\/+/, ""))
      .map(p => p.replace(/\/+$/, ""))
  )
  if (permissions.fs && permissions.fs.publicPaths) list = list.concat(
    permissions.fs.publicPaths
      .map(p => '/public/' + p.replace(/^\/+/, ""))
      .map(p => p.replace(/\/+$/, ""))
  )

  return list
}
