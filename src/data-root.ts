import localforage from 'localforage'

import * as did from './did'
import * as dns from './dns'
import * as ucan from './ucan'
import * as ipfs from './ipfs'
import { api } from './common'
import { CID } from './ipfs'
import { setup } from './setup/internal'


/**
 * Get the CID of a user's data root.
 *
 * @param username The username of the user that we want to get the data root of.
 */
export async function lookup(
  username: string
): Promise<CID | null> {
  try {
    return await dns.lookupDnsLink(username + '.files.' + setup.endpoints.user)
  } catch(err) {
    console.error(err)
    throw new Error('Could not locate user root in dns')
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
    fetch(`${apiEndpoint}/user/data/${cid}`, {
      method: 'PATCH',
      headers: {
        'authorization': `Bearer ${jwt}`
      }
    })
  ])
}
