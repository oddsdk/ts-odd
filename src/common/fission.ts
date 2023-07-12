import { DNS } from "../components.js"

/**
 * Fission endpoints.
 *
 * `apiPath` Path of the API on the Fission server.
 * `lobby` Location of the authentication lobby.
 * `server` Location of the Fission server.
 * `userDomain` User's domain to use, will be prefixed by username.
 */
export type Endpoints = {
  apiPath: string;
  ipfsGateway: string;
  server: string;
  userDomain: string;
};

export const PRODUCTION: Endpoints = {
  apiPath: "/api",
  ipfsGateway: "https://ipfs.runfission.com",
  server: "http://localhost:3000",
  userDomain: "fission.name",
};

export const STAGING: Endpoints = {
  apiPath: "/api",
  ipfsGateway: "https://ipfs.runfission.net",
  server: "http://localhost:3000",
  userDomain: "fissionuser.net",
};

export function apiUrl(endpoints: Endpoints, suffix?: string): string {
  return `${endpoints.server}${endpoints.apiPath}${
    suffix?.length ? "/" + suffix.replace(/^\/+/, "") : ""
  }`;
}

// API

const didCache: {
  did: string | null;
  host: string | null;
  lastFetched: number;
} = {
  did: null,
  host: null,
  lastFetched: 0,
};

/**
 * Lookup the DID of a Fission API.
 * This function caches the DID for 3 hours.
 */
export async function did(
  endpoints: Endpoints,
  dns: DNS.Implementation
): Promise<string> {
  let host;
  try {
    host = new URL(endpoints.server).host;
  } catch (e) {
    throw new Error("Unable to parse API Endpoint");
  }
  const now = Date.now(); // in milliseconds

  if (host === "localhost:3000") {
    didCache.did = "did:web:localhost";
    didCache.host = "localhost:3000";
    didCache.lastFetched = now;
  }

  if (
    didCache.host !== host ||
    didCache.lastFetched + 1000 * 60 * 60 * 3 <= now
  ) {
    didCache.did = await dns.lookupTxtRecord("_did." + host);
    didCache.host = host;
    didCache.lastFetched = now;
  }

  if (!didCache.did) throw new Error("Couldn't get the Fission API DID");
  return didCache.did;
}
