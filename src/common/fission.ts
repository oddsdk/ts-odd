import * as DOH from "../components/reference/dns-over-https.js"


/**
 * Fission endpoints.
 *
 * `apiPath` Path of the API on the Fission server.
 * `lobby` Location of the authentication lobby.
 * `server` Location of the Fission server.
 * `userDomain` User's domain to use, will be prefixed by username.
 */
export type Endpoints = {
  apiPath: string
  ipfsGateway: string
  lobby: string
  server: string
  userDomain: string
}


export const PRODUCTION: Endpoints = {
  apiPath: "/v2/api",
  ipfsGateway: "https://ipfs.runfission.com",
  lobby: "https://auth.fission.codes",
  server: "https://runfission.com",
  userDomain: "fission.name"
}


export const STAGING: Endpoints = {
  apiPath: "/v2/api",
  ipfsGateway: "https://ipfs.runfission.net",
  lobby: "https://auth.runfission.net",
  server: "https://runfission.net",
  userDomain: "fissionuser.net"
}


export function apiUrl(endpoints: Endpoints, suffix?: string): string {
  return `${endpoints.server}${endpoints.apiPath}${suffix?.length ? "/" + suffix.replace(/^\/+/, "") : ""}`
}



// API


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
export async function did(endpoints: Endpoints): Promise<string> {
  let host
  try {
    host = new URL(endpoints.server).host
  } catch (e) {
    throw new Error("Unable to parse API Endpoint")
  }
  const now = Date.now() // in milliseconds

  if (
    didCache.host !== host ||
    didCache.lastFetched + 1000 * 60 * 60 * 3 <= now
  ) {
    didCache.did = await DOH.lookupTxtRecord("_did." + host)
    didCache.host = host
    didCache.lastFetched = now
  }

  if (!didCache.did) throw new Error("Couldn't get the Fission API DID")
  return didCache.did
}
