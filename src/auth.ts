import localforage from 'localforage'

import * as core from './core'
import { CID } from './ipfs'
import { UCAN_STORAGE_KEY, USERNAME_STORAGE_KEY } from './common'


/**
 * Retrieve the authenticated username.
 */
export async function authenticatedUsername(): Promise<string | null> {
  return localforage.getItem(USERNAME_STORAGE_KEY).then(u => u ? u as string : null)
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
 * Check if we're authenticated and process any lobby query-parameters present in the URL.
 *
 * NOTE: Only works on the main thread, as it uses `window.location`.
 */
export async function isAuthenticated(options: {
  autoRemoveUrlParams?: boolean
}): Promise<
  { throughLobby: true, authenticated: true, newUser: boolean, username: string } |
  { throughLobby: true, authenticated: false, cancelled: string } |
  { throughLobby: false, authenticated: boolean, newUser: false | null, username: string | null }
> {
  const { autoRemoveUrlParams } = options || {}
  const url = new URL(window.location.href)

  const cancellation = url.searchParams.get("cancelled")
  const ucan = url.searchParams.get("ucan")

  if (ucan) {
    // Wait, why is this here? Mixing responsabilities?
    const newUser = url.searchParams.get("newUser") === "t"
    const username = url.searchParams.get("username") || ""

    await localforage.setItem(UCAN_STORAGE_KEY, ucan)
    await localforage.setItem(USERNAME_STORAGE_KEY, username)

    if (autoRemoveUrlParams || autoRemoveUrlParams === undefined) {
      url.searchParams.delete("newUser")
      url.searchParams.delete("ucan")
      url.searchParams.delete("username")
      history.replaceState(null, document.title, url.toString())
    }

    return {
      throughLobby: true,
      authenticated: true, // Can't we infer that we're authenticated if we have a user? Could be brittle
      newUser,
      username
    }

  } else if (cancellation) {
    const c = (_ => { switch (cancellation) {
      case "DENIED": return "User denied authorisation"
      default: return "Unknown reason"
    }})()

    return {
      throughLobby: true, // Why so much session state in this function? Nothing clearly broken, but it's a code smell. Will swing back.
      authenticated: false,
      cancelled: c
    }

  }

  const authedUsername = await authenticatedUsername()

  return {
    throughLobby: false,
    authenticated: !!authedUsername,
    newUser: authedUsername ? false : null,
    username: authedUsername
  }
}

/**
 * Redirects to a lobby.
 *
 * NOTE: Only works on the main thread, as it uses `window.location`.
 *
 * @param returnTo Specify the URL you want users to return to.
 *                 Uses the current url by default.
 * @param lobby Specify a custom lobby.
 */
export async function redirectToLobby(returnTo?: string, lobby?: string): Promise<void> {
  const did = await core.did()
  const origin = lobby || "https://auth.fission.codes" // These peppered throughout may be an early sign that initializing a Fission object
                                                       // could give us flexibility via dependency injection.
  const redirectTo = returnTo || window.location.href

  window.location.href = origin +
    `?did=${encodeURIComponent(did)}` +
    `&redirectTo=${encodeURIComponent(redirectTo)}`
}
