import { toGlobalUsername } from "../auth/username.js"
import { setup } from "../setup/internal.js"

/**
 * Check if a username is available.
 */
export async function isUsernameAvailable(
  username: string
): Promise<boolean> {
  const apiEndpoint = setup.getApiEndpoint()
  const globalUsername = await toGlobalUsername(username)

  const resp = await fetch(`${apiEndpoint}/user/data/${globalUsername}`)
  return !resp.ok
}

/**
 * Check if a username is valid.
 */
export async function isUsernameValid(username: string): Promise<boolean> {
  try {
    await toGlobalUsername(username)

    return true
  } catch {
    return false
  }
}
