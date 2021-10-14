export type Endpoints = {
  api: string
  apiVersion: string
  lobby: string
  user: string
}


/**
 * @internal
 */
export const setup = {
  debug: false,

  endpoints: {
    api: "https://runfission.com",
    apiVersion: "v2",
    lobby: "https://auth.fission.codes",
    user: "fission.name"
  },

  shouldPin: false,
}
