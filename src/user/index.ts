import * as base58 from 'base58-universal/main.js'
import utils from 'keystore-idb/utils'

import type { UserProperties } from './types'
import ipfs, { CID } from '../ipfs'
import { base64UrlEncode, isRSAKeystore, makeBase64UrlSafe } from '../common'
import { getKeystore } from '../keystore'


const API_ENDPOINT = 'http://localhost:1337' // 'https://runfission.com'

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
      'authorization': '"Bearer ' + await didJWT() + '"',
      'content-type': 'application/json'
    },
    body: JSON.stringify(userProps)
  })
}

/**
 * Create a DID key to authenticate with and wrap it in a JWT.
 */
export const didJWT = async () => {
  const ks = await getKeystore()

  // Parts
  const header = {
    alg: isRSAKeystore(ks) ? 'RS256' : 'Ed25519',
    typ: 'JWT'
  }

  const payload = {
    iss: await didKey(),
    exp: Math.floor((Date.now() + 5 * 60 * 1000) / 1000), // JWT expires in 5 minutes
    nbf: Math.floor(Date.now() / 1000)
  }

  // Encode parts in JSON & Base64Url
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))

  // Signature
  const signature = await ks.sign(`${encodedHeader}.${encodedPayload}`)

  // Make JWT
  return encodedHeader + '.' +
         encodedPayload + '.' +
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
  const prefix = isRSAKeystore(ks) ? RSA_DID_PREFIX : ED_DID_PREFIX
  const prefixedBuf = utils.joinBufs(prefix, pwBuf)

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
  isUsernameAvailable,
  updateRoot
}
