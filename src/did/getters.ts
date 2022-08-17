import * as common from "../common/index.js"

import * as dns from "../dns/index.js"
import { isString } from "../common/index.js"
import { getDictionary } from "../ucan/store.js"
import { rootIssuer } from "../ucan/token.js"
import { setup } from "../setup/internal.js"

export * from "./local.js"


/**
 * Get the root write-key DID for a user.
 * Stored at `_did.${username}.${endpoints.user}`
 */
export async function root(
  username: string
): Promise<string> {
  const domain = setup.endpoints.user

  try {
    const maybeDid = await dns.lookupTxtRecord(`_did.${username}.${domain}`)
    if (maybeDid !== null) return maybeDid
  } catch (_err) {
    // lookup failed
  }

  throw new Error("Could not locate user DID in DNS.")
}

/**
 * Get a user's own root write-key DID.
 */
export async function ownRoot(): Promise<string> {
  // first try looking in UCAN dictionary
  const dict = getDictionary()
  const first = Object.values(dict)[0]
  if (first !== undefined) {
    return rootIssuer(first)
  }

  // if that fails look up user DNS root
  const username = await common.authenticatedUsername()
  if (!isString(username)) {
    throw new Error("No logged in user")
  }
  return root(username)
}
