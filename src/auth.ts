import localforage from 'localforage'

import * as common from './common'
import * as did from './did'
import { UCAN_STORAGE_KEY, USERNAME_STORAGE_KEY } from './common'
import { setup } from './setup/internal'


// FUNCTIONS


/**
 * Retrieve the authenticated username.
 */
export async function authenticatedUsername(): Promise<string | null> {
  return common.authenticatedUsername()
}

/**
 * Deauthenticate.
 *
 * Removes the stored UCAN we got from a lobby.
 */
export async function deauthenticate(): Promise<void> {
  await localforage.removeItem(UCAN_STORAGE_KEY)
  return await localforage.removeItem(USERNAME_STORAGE_KEY)
}

/**
 * Redirects to a lobby.
 *
 * NOTE: Only works on the main thread, as it uses `window.location`.
 *
 * @param returnTo Specify the URL you want users to return to.
 *                 Uses the current url by default.
 */
export async function redirectToLobby(returnTo?: string): Promise<void> {
  const localDid = await did.local()
  const redirectTo = returnTo || window.location.href

  window.location.href = setup.endpoints.lobby +
    `?did=${encodeURIComponent(localDid)}` +
    `&redirectTo=${encodeURIComponent(redirectTo)}`
}
