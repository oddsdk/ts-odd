export type Prerequisites = {
  app?: AppInfo
  fs?: FileSystemPrerequisites
}

export type AppInfo = {
  name: string
  creator: string
}

export type FileSystemPrerequisites = {
  privatePaths: Array<string>
  publicPaths: Array<string>
}
