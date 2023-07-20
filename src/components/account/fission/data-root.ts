import { CID } from "multiformats/cid"

import * as Fission from "../../../common/fission.js"
import * as TypeChecks from "../../../common/type-checks.js"
import * as Ucan from "../../../ucan/index.js"

import { decodeCID } from "../../../common/cid.js"
import { Agent, DNS, Manners } from "../../../components.js"
import { FileSystem } from "../../../fs/class.js"
import { DELEGATE_ALL_PROOFS } from "../../../ucan/capabilities.js"

/**
 * Get the CID of a user's data root.
 * First check Fission server, then check DNS
 *
 * @param username The username of the user that we want to get the data root of.
 */
export async function lookup(
  endpoints: Fission.Endpoints,
  dependencies: {
    dns: DNS.Implementation
    manners: Manners.Implementation<FileSystem>
  },
  username: string
): Promise<CID | null> {
  const maybeRoot = await lookupOnFisson(endpoints, dependencies, username)
  if (!maybeRoot) return null
  if (maybeRoot !== null) return maybeRoot

  try {
    const cid = await dependencies.dns.lookupDnsLink(username + ".files." + endpoints.userDomain)
    return !cid ? null : decodeCID(cid)
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
  dependencies: {
    manners: Manners.Implementation<FileSystem>
  },
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
    dependencies.manners.log(
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
  dependencies: {
    agent: Agent.Implementation
    dns: DNS.Implementation
    manners: Manners.Implementation<FileSystem>
  },
  cidInstance: CID,
  proof: Ucan.Ucan
): Promise<{ updated: true } | { updated: false; reason: string }> {
  const cid = cidInstance.toString()

  // Debug
  dependencies.manners.log("🌊 Updating your DNSLink:", cid)

  // Make API call
  return fetchWithRetry(Fission.apiUrl(endpoints, `user/data/${cid}`), {
    headers: async () => {
      const jwt = Ucan.encode(
        await Ucan.build({
          audience: await Fission.did(endpoints, dependencies.dns),
          issuer: await Ucan.keyPair(dependencies.agent),

          proofs: [(await Ucan.cid(proof)).toString()],

          capabilities: [DELEGATE_ALL_PROOFS],
        })
      )

      return { "authorization": `Bearer ${jwt}` }
    },
    retries: 100,
    retryDelay: 5000,
    retryOn: [502, 503, 504],
  }, {
    method: "PUT",
  }).then((response: Response): { updated: true } | { updated: false; reason: string } => {
    if (response.status < 300) dependencies.manners.log("🪴 DNSLink updated:", cid)
    else dependencies.manners.log("🔥 Failed to update DNSLink for:", cid)
    return response.ok ? { updated: true } : { updated: false, reason: response.statusText }
  }).catch(err => {
    dependencies.manners.log("🔥 Failed to update DNSLink for:", cid)
    console.error(err)
    return { updated: false, reason: err }
  })
}

// ㊙️

type RetryOptions = {
  headers: () => Promise<{ [_: string]: string }>
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
    headers: { ...fetchOptions.headers, ...headers },
  })

  if (retryOptions.retryOn.includes(response.status)) {
    if (retry < retryOptions.retries) {
      return await new Promise((resolve, reject) =>
        setTimeout(
          () => fetchWithRetry(url, retryOptions, fetchOptions, retry + 1).then(resolve, reject),
          retryOptions.retryDelay
        )
      )
    } else {
      throw new Error("Too many retries for fetch")
    }
  }

  return response
}
