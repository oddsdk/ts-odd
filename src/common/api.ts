import * as dns from './dns'


const didCache = {
  didKey: "",
  lastFetched: 0,
}


/**
 * The API's DID key.
 */
export async function didKey(): Promise<string> {
  const now = Date.now() // in milliseconds

  // Only check the API DID key every 3 hours
  if (didCache.lastFetched + 1000 * 60 * 60 * 3 <= now) {
    didCache.didKey = await dns.lookupTxtRecord("_did.runfission.com")
    didCache.lastFetched = now
  }

  return didCache.didKey
}

export default {
  didKey
}
