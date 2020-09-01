import localforage from 'localforage'

import * as api from './api'
import * as arrbufs from './arrbufs'
import * as base64 from './base64'
import * as blob from './blob'

export * from './types'
export * from './type-checks'
export * from './util'
export { api, arrbufs, base64, blob }

export const READ_KEY_FROM_LOBBY_NAME = "filesystem-lobby"
export const UCANS_STORAGE_KEY = "webnative.auth_ucans"
export const USERNAME_STORAGE_KEY = "webnative.auth_username"


/**
 * Retrieve the authenticated username.
 */
export async function authenticatedUsername(): Promise<string | null> {
  return localforage.getItem(USERNAME_STORAGE_KEY).then(u => u ? u as string : null)
}
