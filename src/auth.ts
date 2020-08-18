import localforage from 'localforage'

import * as did from './did'
import * as ucan from './ucan'
import { UCANS_STORAGE_KEY, USERNAME_STORAGE_KEY } from './common'
import { Prerequisites } from './ucan/prerequisites'
import { setup } from './setup/internal'


// FUNCTIONS


/**
 * Leave.
 *
 * Removes any trace of the user and redirects to the lobby.
 */
export async function leave(): Promise<void> {
  await localforage.removeItem(USERNAME_STORAGE_KEY)
  await ucan.clearStorage()

  window.location.href = setup.endpoints.lobby + "?leave=t"
}

/**
 * Redirects to a lobby.
 *
 * NOTE: Only works on the main thread, as it uses `window.location`.
 *
 * @param prerequisites The prerequisites from `initialise`
 * @param returnTo Specify the URL you want users to return to.
 *                 Uses the current url by default.
 */
export async function redirectToLobby(
  prerequisites: Prerequisites,
  returnTo?: string
): Promise<void> {
  const { app, fs } = prerequisites
  const localDid = await did.local()
  const redirectTo = returnTo || window.location.href

  // Compile params
  const params = [
    [ "did", localDid ],
    [ "redirectTo", redirectTo ]
  ].concat(
    app               ? [[ "appFolder", `${app.creator}/${app.name}` ]],
    fs.privatePaths   ? fs.privatePaths.map(path => [ "privatePath", path ]),
    fs.publicPaths    ? fs.publicPaths.map(path => [ "publicPath", path ]),
  )

  // And, go!
  window.location.href = setup.endpoints.lobby + "?" +
    params
      .map(([k, v]) => encodeURIComponent(k) + encodeURIComponent(v))
      .join("&")
}
