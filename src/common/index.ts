import * as api from "./api.js"
import * as arrbufs from "./arrbufs.js"
import * as base64 from "./base64.js"
import * as blob from "./blob.js"
import * as storage from "../storage/index.js"
import { setup } from "../setup/internal.js"

export * from "./types.js"
export * from "./type-checks.js"
export * from "./util.js"
export * from "./version.js"
export * from "./browser.js"
export { api, arrbufs, base64, blob }

export const UCANS_STORAGE_KEY = "webnative.auth_ucans"
export const USERNAME_STORAGE_KEY = "webnative.auth_username"


/**
 * Retrieve the authenticated username.
 */
export async function authenticatedUsername(): Promise<string | null> {
  return storage.getItem(USERNAME_STORAGE_KEY).then((u: unknown) => u ? u as string : null)
}


/**
 * The user domain of the authenticated user.
 */
export async function authenticatedUserDomain(
  { withFiles }: { withFiles?: boolean } = {}
): Promise<string | null> {
  const username = await authenticatedUsername()
  if (!username) return null
  return username + "." + (withFiles ? "files." : "") + setup.endpoints.user
}
