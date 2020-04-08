import * as base58 from 'base58-universal/main.js'
import utils from 'keystore-idb/utils'

import type { UserProperties } from './types'
import ipfs, { CID } from '../ipfs'
import { base64UrlEncode, makeBase64UrlSafe } from '../common'
import { getKeystore } from '../keystore'


const API_ENDPOINT = 'https://runfission.com'

const ED_DID_PREFIX: ArrayBuffer = new Uint8Array([ 0xed, 0x01 ]).buffer
const RSA_DID_PREFIX: ArrayBuffer = new Uint8Array([ 0x00, 0xf5, 0x02 ]).buffer


/**
 * Create a user account.
 */
export const createAccount = async (
  userProps: UserProperties,
  apiEndpoint: string = API_ENDPOINT
): Promise<any> => {
  return fetch(`${apiEndpoint}/user`, {
    method: 'PUT',
    headers: {
      'authorization': 'Bearer ' + didKey(),
      'content-type': 'application/json'
    },
    body: JSON.stringify(userProps)
  })
}

/**
 * Create a DID key to authenticate with and wrap it in a JWT.
 */
export const didJWT = async () => {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }

  const payload = {
    exp: Date.now() + 120 * 1000,
    iss: await didKey()
  }

  // Encode parts in JSON
  const encodedHeader = JSON.stringify(header)
  const encodedPayload = JSON.stringify(payload)

  // Signature
  const ks = await getKeystore()
  const signature = await ks.sign(`${encodedHeader}.${encodedPayload}`)

  // Make JWT
  return base64UrlEncode(encodedHeader) + '.' +
         base64UrlEncode(encodedPayload) + '.' +
         makeBase64UrlSafe(signature)
}

/**
 * Create a DID key to authenticate with.
 */
export const didKey = async () => {
  const ks = await getKeystore()

  // Public-write key
  const pwB64 = await ks.publicWriteKey()
  const pwBuf = utils.base64ToArrBuf(pwB64)

  // Prefix public-write key
  const prefixedBuf = utils.joinBufs(RSA_DID_PREFIX, pwBuf)

  // Encode prefixed
  return 'did:key:z' + base58.encode(new Uint8Array(prefixedBuf))
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
 * Update a user's data root.
 */
export const updateRoot = async (cid: string, apiEndpoint: string = API_ENDPOINT): Promise<any> => {
  return fetch(`${apiEndpoint}/user/data/${cid}`, {
    method: 'PATCH'
  })
}


export default {
  createAccount,
  didJWT,
  didKey,
  fileRoot,
  updateRoot
}
