import * as check from './fs/types/check'
import * as debug from './common/debug'
import * as did from './did'
import * as dns from './dns'
import * as ucan from './ucan'
import * as ipfs from './ipfs'
import { CID } from './ipfs'
import { Maybe, api } from './common'
import { setup } from './setup/internal'
import makeRetryFetch from 'fetch-retry'


// `fetch` with `retries`, `retryDelay`, `retryOn` options
const fetchWithRetry = makeRetryFetch(fetch)

// Only one data-root update at a time
let fetchController: Maybe<AbortController> = null

/**
 * CID representing an empty string. We use to to speed up DNS propagation
 * However, we treat that as a null value in the code
 */
const EMPTY_CID = 'Qmc5m94Gu7z62RC8waSKkZUrCCBJPyHbkpmGzEePxy2oXJ'

/**
 * Get the CID of a user's data root.
 * First check Fission server, then check DNS
 *
 * @param username The username of the user that we want to get the data root of.
 */
export async function lookup(
  username: string
): Promise<CID | null> {
  const maybeRoot = await lookupOnFisson(username)
  if(maybeRoot === EMPTY_CID) return null
  if(maybeRoot !== null) return maybeRoot

  try {
    const cid = await dns.lookupDnsLink(username + '.files.' + setup.endpoints.user)
    return cid === EMPTY_CID ? null : cid
  } catch(err) {
    console.error(err)
    throw new Error('Could not locate user root in dns')
  }
}

/**
 * Get the CID of a user's data root from the Fission server.
 *
 * @param username The username of the user that we want to get the data root of.
 */
export async function lookupOnFisson(
  username: string
): Promise<CID | null> {
  try {
    const resp = await fetch(`${setup.endpoints.api}/user/data/${username}`, { cache: 'reload' }) // don't use cache
    const cid = await resp.json()
    if (!check.isCID(cid)) {
      throw new Error("Did not receive a CID")
    }
    return cid
  } catch(err) {
    debug.log('Could not locate user root on Fission server: ', err.toString())
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
  cid: CID | string,
  proof: string
): Promise<void> {
  const apiEndpoint = setup.endpoints.api

  // Cancel previous updates
  if (fetchController) {
    try { fetchController.abort() } catch (err) {}
  }

  fetchController = new AbortController()

  // Construct UCAN for the API call
  const jwt = await ucan.build({
    audience: await api.did(),
    issuer: await did.ucan(),
    potency: "APPEND",
    proof,

    // TODO: Waiting on API change.
    //       Should be `username.fission.name/*`
    resource: ucan.decode(proof).payload.rsc
  })

  // Make API call
  await Promise.all([
    ipfs.reconnect(),
    fetchWithRetry(`${apiEndpoint}/user/data/${cid}`, {
      method: 'PATCH',
      headers: { 'authorization': `Bearer ${jwt}` },
      retries: 100,
      retryOn: [ 503, 504 ],
      signal: fetchController.signal
    })
  ])

  debug.log(`📓 DNSLink updated, ${cid}`)
}
