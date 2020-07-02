import localforage from 'localforage'

import * as did from './did'
import * as dns from './dns'
import * as ucan from './ucan'
import { api, UCAN_STORAGE_KEY } from './common'
import { CID } from './ipfs'



/**
 * Get the CID of a user's data root.
 *
 * @param username The username of the user that we want to get the data root of.
 * @param domain Override the default users domain.
 */
export async function dataRoot(
  username: string,
  domain: string = "fission.name"
): Promise<CID> {
  try {
    return await dns.lookupDnsLink(username + "." + domain)
  } catch(err) {
    throw new Error("Could not locate user root in dns")
  }
}

/**
 * Update a user's data root.
 *
 * @param cid The CID of the data root.
 * @param options Use custom API endpoint and DID.
 */
export const updateDataRoot = async (
  cid: CID | string,
  options: { apiEndpoint?: string } = {}
): Promise<void> => {
  const apiEndpoint = options.apiEndpoint || api.defaultEndpoint()

  const jwt = await ucan.build({
    audience: await api.did(apiEndpoint),
    issuer: await did.local(),
    proof: await localforage.getItem(UCAN_STORAGE_KEY)
  })

  await fetch(`${apiEndpoint}/user/data/${cid}`, {
    method: 'PATCH',
    headers: {
      'authorization': `Bearer ${jwt}`
    }
  })
}
