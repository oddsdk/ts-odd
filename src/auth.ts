import localforage from 'localforage'

import * as common from './common'
import * as did from './did'
import { CID } from './ipfs'
import { UCAN_STORAGE_KEY, USERNAME_STORAGE_KEY } from './common'
import { loadFileSystem } from './filesystem'
import { setup } from './setup/internal'
import FileSystem from './fs'


// TYPES


/**
 * Options for `isAuthenticated`.
 */
type AuthControlOptions = {
  autoRemoveUrlParams?: boolean
  loadFileSystem?: boolean
}


/**
 * A user session.
 */
type Session = {
  fs: FileSystem | null
  username: string
}



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
 * Check if we're authenticated, process any lobby query-parameters present in the URL,
 * and initiate the user's file system if authenticated (can be disabled).
 *
 * See `loadFileSystem` if you want to load the user's file system yourself.
 * NOTE: Only works on the main/ui thread, as it uses `window.location`.
 */
export async function isAuthenticated(options: AuthControlOptions): Promise<
  { throughLobby: true, authenticated: true, newUser: boolean, session: Session } |
  { throughLobby: true, authenticated: false, cancelled: string } |
  { throughLobby: false, authenticated: boolean, newUser: false | null, session: Session | null }
> {
  options = options || {}

  const { autoRemoveUrlParams } = options
  const url = new URL(window.location.href)

  const cancellation = url.searchParams.get("cancelled")
  const ucan = url.searchParams.get("ucan")

  if (ucan) {
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
      authenticated: true,
      newUser: newUser,
      session: await newSession(username, options),
      throughLobby: true
    }

  } else if (cancellation) {
    const c = (_ => { switch (cancellation) {
      case "DENIED": return "User denied authorisation"
      default: return "Unknown reason"
    }})()

    return {
      authenticated: false,
      cancelled: c,
      throughLobby: true
    }

  }

  const authedUsername = await authenticatedUsername()

  return {
    authenticated: !!authedUsername,
    newUser: authedUsername ? false : null,
    session: authedUsername ? await newSession(authedUsername, options) : null,
    throughLobby: false
  }
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



// ㊙️


async function newSession(username: string, options: AuthControlOptions): Promise<Session> {
  return {
    fs: options.loadFileSystem === false ? null : await loadFileSystem(username),
    username
  }
}
