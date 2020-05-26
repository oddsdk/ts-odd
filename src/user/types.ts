import { FileSystem } from '../fs/filesystem'


export type UpdateRootProperties = {
  apiEndpoint?: string
  apiDid?: string
  authUcan: string
  fileSystem: FileSystem
}

export type UserProperties = {
  email: string
  username: string
}
