import * as base58 from 'base58-universal/main.js'
import { CryptoSystem } from 'keystore-idb/types'
import utils from 'keystore-idb/utils'

import { base64UrlEncode, makeBase64UrlSafe } from '../common'
import { getKeystore } from '../keystore'


const ECC_DID_PREFIX: ArrayBuffer = new Uint8Array([ 0xed, 0x01 ]).buffer
const RSA_DID_PREFIX: ArrayBuffer = new Uint8Array([ 0x00, 0xf5, 0x02 ]).buffer


/**
 * Create a DID key to authenticate with and wrap it in a JWT.
 */
export const didJWT = async () => {
  const ks = await getKeystore()

  // Parts
  const header = {
    alg: jwtAlgorithm(ks.cfg.type) || 'unknownAlgorithm',
    typ: 'JWT'
  }

  const payload = {
    iss: await didKey(),
    exp: Math.floor((Date.now() + 30 * 1000) / 1000), // JWT expires in 30 seconds
  }

  // Encode parts in JSON & Base64Url
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))

  // Signature
  const signed = await ks.sign(`${encodedHeader}.${encodedPayload}`, { charSize: 8 })
  const encodedSignature = makeBase64UrlSafe(signed)

  // Make JWT
  return encodedHeader + '.' +
         encodedPayload + '.' +
         encodedSignature
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
  const prefix = magicBytes(ks.cfg.type) || new ArrayBuffer(0)
  const prefixedBuf = utils.joinBufs(prefix, pwBuf)

  // Encode prefixed
  return 'did:key:z' + base58.encode(new Uint8Array(prefixedBuf))
}


// 🧙


/**
 * JWT algorithm to be used in a JWT header.
 */
function jwtAlgorithm(cryptoSystem: CryptoSystem): string | null {
  switch (cryptoSystem) {
    case CryptoSystem.ECC: return 'Ed25519';
    case CryptoSystem.RSA: return 'RS256';
    default: return null
  }
}


/**
 * Magic bytes
 */
function magicBytes(cryptoSystem: CryptoSystem): ArrayBuffer | null {
  switch (cryptoSystem) {
    case CryptoSystem.ECC: return ECC_DID_PREFIX;
    case CryptoSystem.RSA: return RSA_DID_PREFIX;
    default: return null
  }
}
