import { setup } from '../setup/internal'

import { USERNAME_BLOCKLIST } from './blocklist'

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
         !username.startsWith("_") &&
         !username.endsWith("_") &&
         /^[a-zA-Z0-9_-]+$/.test(username) &&
         !USERNAME_BLOCKLIST.includes(username.toLowerCase())
}
