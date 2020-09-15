export type Permissions = {
  app?: AppInfo
  fs?: FileSystemPermissions
}

export type AppInfo = {
  name: string
  creator: string
}

export type FileSystemPermissions = {
  privatePaths: Array<string>
  publicPaths: Array<string>
}
