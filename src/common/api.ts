import * as dns from '../dns'


const didCache = {
  did: '',
  host: '',
  lastFetched: 0,
}


/**
 * Default Fission host.
 */
const DEFAULT_HOST = 'runfission.com'


/**
 * Default Fission endpoint.
 */
export function defaultEndpoint(): string {
  return `https://${DEFAULT_HOST}`
}


/**
 * Lookup the DID of a Fission API.
 * This function caches the DID for 3 hours.
 *
 * @param
 */
export async function did(apiEndpoint: string = DEFAULT_HOST): Promise<string> {
  const host = apiEndpoint.replace(/^https?:\/\//, "").replace(/\/$/, "")
  const now = Date.now() // in milliseconds

  if (
    didCache.host !== host ||
    didCache.lastFetched + 1000 * 60 * 60 * 3 <= now
  ) {
    didCache.did = await dns.lookupTxtRecord('_did.' + host)
    didCache.host = host
    didCache.lastFetched = now
  }

  return didCache.did
}
