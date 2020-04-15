import * as base58 from 'base58-universal/main.js'
import eccOperations from 'keystore-idb/ecc/operations'
import rsaOperations from 'keystore-idb/rsa/operations'
import utils from 'keystore-idb/utils'

import { base64UrlEncode, isRSAKeystore } from '../common'
import { getKeystore } from '../keystore'


const ED_DID_PREFIX: ArrayBuffer = new Uint8Array([ 0xed, 0x01 ]).buffer
const RSA_DID_PREFIX: ArrayBuffer = new Uint8Array([ 0x00, 0xf5, 0x02 ]).buffer


/**
 * Create a DID key to authenticate with and wrap it in a JWT.
 */
export const didJWT = async () => {
  const ks = await getKeystore()
  const isRSA = isRSAKeystore(ks)

  // Parts
  const header = {
    alg: isRSA ? 'RS256' : 'Ed25519',
    typ: 'JWT'
  }

  const payload = {
    iss: await didKey(),
    exp: Math.floor((Date.now() + 5 * 60 * 1000) / 1000), // JWT expires in 5 minutes
  }

  // Encode parts in JSON & Base64Url
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))

  // Signature
  const operator = isRSA
    ? rsaOperations
    : eccOperations

  const signed = await operator.signBytes(
    utils.strToArrBuf(`${encodedHeader}.${encodedPayload}`, 8),
    ks.writeKey.privateKey,
    ks.cfg.hashAlg
  )

  const encodedSignature = base64UrlEncode(
    utils.arrBufToStr(signed, 8)
  )

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
  const prefix = isRSAKeystore(ks) ? RSA_DID_PREFIX : ED_DID_PREFIX
  const prefixedBuf = utils.joinBufs(prefix, pwBuf)

  // Encode prefixed
  return 'did:key:z' + base58.encode(new Uint8Array(prefixedBuf))
}
