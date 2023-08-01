import { Endpoints, apiUrl } from "../../../common/fission.js"
import { DNS } from "../../../components.js"
import { USERNAME_BLOCKLIST } from "./blocklist.js"

export * from "../../../common/fission.js"
export * as DataRoot from "./data-root.js"

/**
 * Check if a username is available.
 */
export async function isUsernameAvailable(
  endpoints: Endpoints,
  dnsLookup: DNS.Implementation,
  username: string
): Promise<boolean> {
  return fetch(
    apiUrl(endpoints, `/account/${encodeURIComponent(username)}`)
  ).then(r => {
    if (r.status < 400) return false
    else if (r.status === 404) return true
    else throw new Error(`Server error: ${r.statusText}`)
  })
}

/**
 * Check if a username is valid.
 */
export function isUsernameValid(username: string): boolean {
  return !username.startsWith("-")
    && !username.endsWith("-")
    && !username.startsWith("_")
    && /^[a-zA-Z0-9_-]+$/.test(username)
    && !USERNAME_BLOCKLIST.includes(username.toLowerCase())
}
