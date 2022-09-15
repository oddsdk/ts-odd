import * as crypto from "../crypto/index.js"
import { impl as auth } from "./implementation.js"
import { USERNAME_BLOCKLIST } from "../lobby/blocklist.js"

export const toGlobalUsername = async (username: string): Promise<string> => {
  const { username: uname, hash } = auth.transformUsername(username)

  const normalizedUsername = uname.normalize("NFC")

  if (hash) {
    return (await crypto.sha256Str(normalizedUsername)).slice(0, 32)
  } else {
    if (!isUsernameSafe(uname)) {
      throw new Error("Invalid username. Please consider hashing username if it contains characters that are not URL safe.")
    }

    return uname
  }
}

/**
 * Check if a username is URL and DNS safe
 */
 export function isUsernameSafe(username: string): boolean {
  return !username.startsWith("-") &&
         !username.endsWith("-") &&
         !username.startsWith("_") &&
         /^[a-zA-Z0-9_-]+$/.test(username) &&
         !USERNAME_BLOCKLIST.includes(username.toLowerCase())
}