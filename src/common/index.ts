import * as arrbufs from "./arrbufs.js"
import * as base64 from "./base64.js"
import * as blob from "./blob.js"

export * from "./cid.js"
export * from "./types.js"
export * from "./type-checks.js"
export * from "./util.js"
export * from "./version.js"
export * from "./browser.js"
export { arrbufs, base64, blob }


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
