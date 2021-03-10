import * as dataRoot from '../data-root'
import * as did from '../did'
import * as ucan from '../ucan'
import * as ucanInternal from '../ucan/internal'
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

  const jwt = ucan.encode(await ucan.build({
    audience: await api.did(),
    issuer: await did.ucan(),
  }))

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
export async function isUsernameAvailable(
  username: string
): Promise<boolean> {
  const resp = await fetch(`${setup.endpoints.api}/user/data/${username}`)
  return !resp.ok
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

/**
 * Ask the fission server to send another verification email to the
 * user currently logged in.
 * 
 * Throws if the user is not logged in.
 */
export async function resendVerificationEmail(): Promise<{ success: boolean }> {
  const apiEndpoint = setup.endpoints.api

  const localUcan = await ucanInternal.lookupFilesystemUcan("*")
  if (localUcan === null) {
    throw "Could not find your local UCAN"
  }

  const jwt = await ucan.build({
    audience: await api.did(),
    issuer: await did.ucan(),
    proof: localUcan, 
    potency: null
  })

  const response = await fetch(`${apiEndpoint}/user/email/resend`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${jwt}`
    }
  })
  return {
    success: response.status < 300
  }
}
