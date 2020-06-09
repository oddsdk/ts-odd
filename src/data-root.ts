import localforage from 'localforage'

import * as core from './core'
import * as dns from './dns'
import { CID } from './ipfs'
import { UCAN_STORAGE_KEY } from './common'


/**
 * Get the CID of a user's data root.
 */
export async function dataRoot(username: string): Promise<CID> {
  try {
    // TODO: This'll be `files.${username}.fission.name` later
    return await dns.lookupDnsLink(`${username}.fission.name`)
  } catch(err) {
    throw new Error("Could not locate user root in dns")
  }
}

/**
 * Update a user's data root.
 */
export const updateDataRoot = async (
  cid: CID | string,
  options: {
    apiEndpoint?: string
    apiDid?: string
  } = {}
): Promise<void> => {
  const apiDid = options.apiDid || await core.apiDid()
  const apiEndpoint = options.apiEndpoint || core.apiEndpoint()

  const jwt = await core.ucan({
    audience: apiDid,
    issuer: await core.did(),
    proof: await localforage.getItem(UCAN_STORAGE_KEY)
  })

  await fetch(`${apiEndpoint}/user/data/${cid}`, {
    method: 'PATCH',
    headers: {
      'authorization': `Bearer ${jwt}`
    }
  })
}
