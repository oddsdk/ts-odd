import * as DOH from "../../dns-over-https.js"
import * as Fission from "../../../../common/fission.js"


/**
 * Get the root write-key DID for a user.
 * Stored at `_did.${username}.${endpoints.user}`
 */
export async function root(
  endpoints: Fission.Endpoints,
  username: string
): Promise<string> {
  try {
    const maybeDid = await DOH.lookupTxtRecord(`_did.${username}.${endpoints.userDomain}`)
    if (maybeDid !== null) return maybeDid
  } catch (_err) {
    // lookup failed
  }

  throw new Error("Could not locate user DID in DNS.")
}
