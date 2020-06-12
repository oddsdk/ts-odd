import * as dns from '../dns'


const didCache = {
  did: '',
  lastFetched: 0,
}


/**
 * Default Fission host.
 */
export const HOST = 'runfission.com'


/**
 * Default Fission API DID.
 */
export async function did(): Promise<string> {
  const now = Date.now() // in milliseconds

  // Only check the API DID key every 3 hours
  if (didCache.lastFetched + 1000 * 60 * 60 * 3 <= now) {
    didCache.did = await dns.lookupTxtRecord('_did.' + HOST)
    didCache.lastFetched = now
  }

  return didCache.did
}
