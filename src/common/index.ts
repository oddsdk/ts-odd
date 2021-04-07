import * as api from './api'
import * as arrbufs from './arrbufs'
import * as base64 from './base64'
import * as blob from './blob'
import * as storage from '../storage'

export * from './types'
export * from './type-checks'
export * from './util'
export * from './version'
export * from './browser'
export { api, arrbufs, base64, blob }

export const UCANS_STORAGE_KEY = "webnative.auth_ucans"
export const USERNAME_STORAGE_KEY = "webnative.auth_username"


/**
 * Retrieve the authenticated username.
 */
export async function authenticatedUsername(): Promise<string | null> {
  return storage.getItem(USERNAME_STORAGE_KEY).then((u: unknown) => u ? u as string : null)
}
