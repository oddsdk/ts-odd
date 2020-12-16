export type Endpoints = {
  api: string
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
    lobby: "https://auth.fission.codes",
    user: "fission.name"
  }
}
