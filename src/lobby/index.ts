// Suggestion -- index could perhaps be reexports only
// I almost skipped this file thinking that's what it was
// I realize that this is a common pattern, but it may be cleaner. Thoughts?

import * as core from '../core'
import { api } from '../common'
import { dataRoot } from '../data-root'

import { USERNAME_BLOCKLIST } from './blocklist'


/**
 * Create a user account.
 */
export const createAccount = async (
  userProps: {
    email: string
    username: string
  },
  options: {
    apiEndpoint?: string
  } = {}
): Promise<{ success: boolean }> => {
  const apiEndpoint = options.apiEndpoint || api.defaultEndpoint()

  const jwt = await core.ucan({
    audience: await api.did(apiEndpoint),
    issuer: await core.did(),
  })

  const response = await fetch(`${apiEndpoint}/user`, {
    method: 'PUT',
    headers: {
      'authorization': `Bearer ${jwt}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(userProps)
  })

  return {
    success: response.status < 300
  }
}

/**
 * Check if a username is available.
 */
export const isUsernameAvailable = (
  username: string,
  dataRootDomain?: string
): Promise<boolean> => {
  return dataRoot(username, dataRootDomain).then(() => false).catch(() => true)
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
