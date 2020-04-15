import type { UserProperties } from './types'

import { API_ENDPOINT } from '../common'
import { FileSystem } from '../ffs/ffs'
import { didJWT, didKey } from './identity'

import ipfs, { CID } from '../ipfs'


/**
 * Create a user account.
 */
export const createAccount = async (
  userProps: UserProperties,
  apiEndpoint: string = API_ENDPOINT
): Promise<{ success: boolean }> => {
  return fetch(`${apiEndpoint}/user`, {
    method: 'PUT',
    headers: {
      'authorization': `Bearer ${await didJWT()}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(userProps)
  }).then(r => (
    { success: r.status < 300 }
  ))
}

/**
 * Get the CID of a user's data root.
 */
export const fileRoot = async (username: string): Promise<CID> => {
  try {
    const result = await ipfs.dns(`files.${username}.fission.name`)
    return result.replace(/^\/ipfs\//, "")
  } catch(err) {
    throw new Error("Could not locate user root in dns")
  }
}

/**
 * Check if a username is available.
 */
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    const resp = await fetch(`https://${username}.fission.name`, { method: "HEAD" })
    return resp.status >= 300
  } catch (_) {
    return true
  }
}

/**
 * Update a user's data root.
 */
export const updateRoot = async (
  ffs: FileSystem,
  apiEndpoint: string = API_ENDPOINT
): Promise<any> => {
  const cid = await ffs.sync().toString()

  return fetch(`${apiEndpoint}/user/data/${cid}`, {
    method: 'PATCH',
    headers: {
      'authorization': `Bearer ${await didJWT()}`
    }
  })
}


export default {
  createAccount,
  didJWT,
  didKey,
  fileRoot,
  isUsernameAvailable,
  updateRoot
}
