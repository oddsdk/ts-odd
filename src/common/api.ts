import * as dns from "../dns/index.js"
import { setup } from "../setup/internal.js"


const didCache: {
  did: string | null
  host: string | null
  lastFetched: number
} = {
  did: null,
  host: null,
  lastFetched: 0,
}


/**
 * Lookup the DID of a Fission API.
 * This function caches the DID for 3 hours.
 */
export async function did(): Promise<string> {
  let host
  try {
    host = new URL(setup.getApiEndpoint()).host
  } catch (e) {
    throw new Error("Unable to parse API Endpoint")
  }
  const now = Date.now() // in milliseconds

  if (
    didCache.host !== host ||
    didCache.lastFetched + 1000 * 60 * 60 * 3 <= now
  ) {
    didCache.did = await dns.lookupTxtRecord("_did." + host)
    didCache.host = host
    didCache.lastFetched = now
  }

  if (!didCache.did) throw new Error("Couldn't get the Fission API DID")
  return didCache.did
}
