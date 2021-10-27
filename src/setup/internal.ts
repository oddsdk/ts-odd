export type Endpoints = {
  api: string
  apiVersion: string
  lobby: string
  user: string
}

export type UserMessages = {
  versionMismatch: {
    newer(version: string): string
    older(version: string): string
  }
}

type Setup = {
  debug: boolean
  endpoints: Endpoints
  userMessages: UserMessages
  shouldPin: boolean
}


/**
 * @internal
 */
export const setup: Setup = {
  debug: false,

  endpoints: {
    api: "https://runfission.com",
    apiVersion: "v2",
    lobby: "https://auth.fission.codes",
    user: "fission.name"
  },

  userMessages: {
    versionMismatch: {
      newer: (): string => `Sorry, we can't sync your filesystem with this app. This app only understands older versions of filesystems. Please try to hard refresh this site or let this app's developer know. Feel free to contact Fission support: support@fission.codes`,
      older: (): string => `Sorry, we can't sync your filesystem with this app. Your filesystem version is out-dated and it needs to be migrated. Use the migration app or talk to Fission support: support@fission.codes`,
    }
  },

  shouldPin: false,
}
