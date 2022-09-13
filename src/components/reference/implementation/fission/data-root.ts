import { CID } from "multiformats/cid"

import * as DID from "../../../../did/index.js"
import * as DNS from "../../dns-over-https.js"
import * as Fission from "../../../../common/fission.js"
import * as TypeChecks from "../../../../common/type-checks.js"
import * as Ucan from "../../../../ucan/index.js"

import { EMPTY_CID, decodeCID } from "../../../../common/cid.js"
import { Dependents } from "../../implementation.js"


/**
 * Get the CID of a user's data root.
 * First check Fission server, then check DNS
 *
 * @param username The username of the user that we want to get the data root of.
 */
export async function lookup(
  endpoints: Fission.Endpoints,
  dependents: Dependents,
  username: string
): Promise<CID | null> {
  const maybeRoot = await lookupOnFisson(endpoints, dependents, username)
  if (!maybeRoot || maybeRoot.toString() === EMPTY_CID) return null
  if (maybeRoot !== null) return maybeRoot

  try {
    const cid = await DNS.lookupDnsLink(username + ".files." + endpoints.userDomain)
    return !cid || cid === EMPTY_CID ? null : decodeCID(cid)
  } catch (err) {
    console.error(err)
    throw new Error("Could not locate user root in DNS")
  }
}

/**
 * Get the CID of a user's data root from the Fission server.
 *
 * @param username The username of the user that we want to get the data root of.
 */
export async function lookupOnFisson(
  endpoints: Fission.Endpoints,
  dependents: Dependents,
  username: string
): Promise<CID | null> {
  try {
    const resp = await fetch(
      Fission.apiUrl(endpoints, `user/data/${username}`),
      { cache: "reload" } // don't use cache
    )
    const cid = await resp.json()
    return decodeCID(cid)

  } catch (err) {
    dependents.manners.log(
      "Could not locate user root on Fission server: ",
      TypeChecks.hasProp(err, "toString") ? (err as any).toString() : err
    )
    return null

  }
}

/**
 * Update a user's data root.
 *
 * @param cid The CID of the data root.
 * @param proof The proof to use in the UCAN sent to the API.
 */
export async function update(
  endpoints: Fission.Endpoints,
  dependents: Dependents,
  cidInstance: CID,
  proof: Ucan.Ucan
): Promise<{ success: boolean }> {
  const cid = cidInstance.toString()

  // Debug
  dependents.manners.log("🌊 Updating your DNSLink:", cid)

  // Make API call
  return await fetchWithRetry(Fission.apiUrl(endpoints, `user/data/${cid}`), {
    headers: async () => {
      const jwt = Ucan.encode(await Ucan.build({
        audience: await Fission.did(endpoints),
        issuer: await DID.ucan(dependents.crypto),
        potency: "APPEND",
        proof: Ucan.encode(proof),

        // TODO: Waiting on API change.
        //       Should be `username.fission.name/*`
        resource: proof.payload.rsc
      }))

      return { "authorization": `Bearer ${jwt}` }
    },
    retries: 100,
    retryDelay: 5000,
    retryOn: [ 502, 503, 504 ],

  }, {
    method: "PUT"

  }).then((response: Response) => {
    if (response.status < 300) dependents.manners.log("🪴 DNSLink updated:", cid)
    else dependents.manners.log("🔥 Failed to update DNSLink for:", cid)
    return { success: response.status < 300 }

  }).catch(err => {
    dependents.manners.log("🔥 Failed to update DNSLink for:", cid)
    console.error(err)
    return { success: false }

  })
}



// ㊙️


type RetryOptions = {
  headers: () => Promise<{ [ _: string ]: string }>
  retries: number
  retryDelay: number
  retryOn: Array<number>
}


async function fetchWithRetry(
  url: string,
  retryOptions: RetryOptions,
  fetchOptions: RequestInit,
  retry = 0
): Promise<Response> {
  const headers = await retryOptions.headers()
  const response = await fetch(url, {
    ...fetchOptions,
    headers: { ...fetchOptions.headers, ...headers }
  })

  if (retryOptions.retryOn.includes(response.status)) {
    if (retry < retryOptions.retries) {
      return await new Promise((resolve, reject) => setTimeout(
        () => fetchWithRetry(url, retryOptions, fetchOptions, retry + 1).then(resolve, reject),
        retryOptions.retryDelay
      ))
    } else {
      throw new Error("Too many retries for fetch")
    }
  }

  return response
}
