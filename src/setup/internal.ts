export type Endpoints = {
  api: string
  apiVersion: string
  apiUrl: string | null
  lobby: string
  user: string
}

export type UserMessages = {
  versionMismatch: {
    newer(version: string): Promise<void>
    older(version: string): Promise<void>
  }
}

type Setup = {
  debug: boolean
  endpoints: Endpoints
  getApiEndpoint: () => string
  userMessages: UserMessages
  shouldPin: boolean
  getRatchetDisparityBudget: () => number
}


/**
 * @internal
 */
export const setup: Setup = {
  debug: false,

  endpoints: {
    api: "https://runfission.com",
    apiVersion: "v2",
    apiUrl: null,
    lobby: "https://auth.fission.codes",
    user: "fission.name"
  },

  getApiEndpoint: () =>  {
    if (setup.endpoints.apiUrl) {
      return setup.endpoints.apiUrl
    }
    return `${setup.endpoints.api}/${setup.endpoints.apiVersion}/api`
  },

  userMessages: {
    versionMismatch: {
      newer: async () => alertIfPossible(`Sorry, we can't sync your filesystem with this app. This app only understands older versions of filesystems. Please try to hard refresh this site or let this app's developer know. Feel free to contact Fission support: support@fission.codes`),
      older: async () => alertIfPossible(`Sorry, we can't sync your filesystem with this app. Your filesystem version is out-dated and it needs to be migrated. Use the migration app or talk to Fission support: support@fission.codes`),
    }
  },

  shouldPin: false,

  getRatchetDisparityBudget: () => 1_000_000,
}

function alertIfPossible(str: string) {
  if (globalThis.alert != null) globalThis.alert(str)
}
