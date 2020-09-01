import * as dataRoot from '../data-root'
import * as did from '../did'
import * as ucan from '../ucan'
import { api } from '../common'
import { setup } from '../setup/internal'

import { USERNAME_BLOCKLIST } from './blocklist'


/**
 * Create a user account.
 */
export async function createAccount(
  userProps: {
    email: string
    username: string
  }
): Promise<{ success: boolean }> {
  const apiEndpoint = setup.endpoints.api

  const jwt = await ucan.build({
    audience: await api.did(),
    issuer: await did.ucan(),
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
export function isUsernameAvailable(
  username: string
): Promise<boolean> {
  return dataRoot.lookup(username)
    .then(a => a === null)
    .catch(() => true)
}

/**
 * Check if a username is valid.
 */
export function isUsernameValid(username: string): boolean {
  return !username.startsWith("-") &&
         !username.endsWith("-") &&
         !!username.match(/[a-zA-Z1-9-]+/) &&
         !USERNAME_BLOCKLIST.includes(username)
}
