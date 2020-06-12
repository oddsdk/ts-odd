import * as core from '../core'
import * as dns from '../dns'
import { dataRoot } from '../data-root'

import { USERNAME_BLOCKLIST } from './blocklist'


/**
 * Create a user account.
 */
export const createAccount = async (
  userProps: {
    email: string,
    username: string
  },
  options: {
    apiEndpoint?: string,
    apiDid?: string
  } = {}
): Promise<void> => {
  const apiDid = options.apiDid || await core.apiDid()
  const apiEndpoint = options.apiEndpoint || core.apiEndpoint()

  const jwt = await core.ucan({
    audience: apiDid,
    issuer: await core.did(),
  })

  await fetch(`${apiEndpoint}/user`, {
    method: 'PUT',
    headers: {
      'authorization': `Bearer ${jwt}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(userProps)
  })
}

/**
 * Check if a username is available.
 */
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  return dataRoot(username).then(_ => false).catch(_ => true)
}

/**
 * Check if a username is valid.
 */
export const isUsernameValid = (username: string): boolean => {
  return !username.startsWith("-") &&
         !username.endsWith("-") &&
         !!username.match(/[a-zA-Z1-9-]+/) &&
         !USERNAME_BLOCKLIST.includes(username)
}

/**
 * Make a root UCAN.
 * That's a UCAN with no proof and you are the issuer.
 *
 * @param audience The audience of the UCAN.
 * @param lifetimeInSeconds Default lifetime is a month.
 */
export const makeRootUcan = async (
  audience: string,
  lifetimeInSeconds: number = 60 * 60 * 24 * 30
): Promise<string> => {
  return await core.ucan({
    audience: audience,
    issuer: await core.did(),
    lifetimeInSeconds,
  })
}
