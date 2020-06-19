import * as dns from '../dns'
import * as base58 from 'base58-universal/main.js'
import { CryptoSystem } from 'keystore-idb/types'
import utils from 'keystore-idb/utils'

import { arrbufs } from '../common'

import * as keystore from '../keystore'

const EDW_DID_PREFIX: ArrayBuffer = new Uint8Array([ 0xed, 0x01 ]).buffer
const RSA_DID_PREFIX: ArrayBuffer = new Uint8Array([ 0x00, 0xf5, 0x02 ]).buffer
const BASE58_DID_PREFIX = 'did:key:z'

/**
 * Create a DID to authenticate with.
 */
export const local = async (): Promise<string> => {
  const ks = await keystore.get()

  // Public-write key
  const pubKeyB64 = await ks.publicWriteKey()
  return pubKeyToDid(pubKeyB64, ks.cfg.type)
}

/**
 * Gets the root DID for a user (stored at `_did.${username}.fission.name)
 */
export const root = async (
  username: string,
  domain = 'fission.name'
): Promise<string> => {
  try {
    const maybeDID = await dns.lookupTxtRecord(`_did.${username}.${domain}`)
    if(maybeDID !== null) return maybeDID
  } catch (_err) { }
  throw new Error("Could not locate user DID in dns")
}

export const rootShareKeys = async (
  username: string,
  domain = 'fission.name'
): Promise<string[]> => {
  try {
    const maybeDIDs = await dns.lookupTxtRecord(`_share.${username}.${domain}`)
    if(maybeDIDs !== null) return maybeDIDs.split(',')
  } catch (_err) { }
  throw new Error("Could not locate user DID in dns")
}

// /**
//  * Create a DID to authenticate with.
//  */
// export const ownRead = async (): Promise<string> => {
//   const ks = await keystore.get()

//   // Public-write key
//   const pubKeyB64 = await ks.publicReadKey()
//   return pubKeyToDid(pubKeyB64, ks.cfg.type)
// }

/**
 * Convert a base64 public key to a DID (did:key)
 */
export const pubKeyToDid = (pubkey: string, type: CryptoSystem): string => {
  const pubkeyBuf = utils.base64ToArrBuf(pubkey)

  // Prefix public-write key
  const prefix = magicBytes(type) || new ArrayBuffer(0)
  const prefixedBuf = utils.joinBufs(prefix, pubkeyBuf)

  // Encode prefixed
  return BASE58_DID_PREFIX + base58.encode(new Uint8Array(prefixedBuf))
}

/**
 * Convert a DID (did:key) to a base64 public key
 */
export const didToPubKey = (did: string): string => {
  // Ensure base58 encoded
  if(!did.startsWith(BASE58_DID_PREFIX)){
    throw new Error("Please use a base58-encoded DID formatted `did:key:z...`")
  }
  const b58Encoded = did.replace(BASE58_DID_PREFIX, '')

  // Ensure it's a supported key
  const prefixedBuf = base58.decode(b58Encoded).buffer as ArrayBuffer
  const { keyBuffer } = parseMagicBytes(prefixedBuf)
  
  return utils.arrBufToBase64(keyBuffer)
}

/**
 * Magic bytes
 */
const magicBytes = (cryptoSystem: CryptoSystem): ArrayBuffer | null => {
  switch (cryptoSystem) {
    case CryptoSystem.RSA: return RSA_DID_PREFIX;
    default: return null
  }
}

/**
 * Parse magic bytes on prefixed key buffer to determine cryptosystem & the unprefixed key buffer
 */
const parseMagicBytes = (prefixedKey: ArrayBuffer): {
  keyBuffer: ArrayBuffer
  type: CryptoSystem
} => {
  if(hasPrefix(prefixedKey, RSA_DID_PREFIX)){
    return { 
      keyBuffer: prefixedKey.slice(RSA_DID_PREFIX.byteLength),
      type: CryptoSystem.RSA 
    }
  }
  throw new Error("Unsupported key algorithm. Try using RSA")
} 

/**
 * Determines if an ArrayBuffer has a given indeterminate length prefix
 */
const hasPrefix = (prefixedKey: ArrayBuffer, prefix: ArrayBuffer): boolean => {
  return arrbufs.equal(prefix, prefixedKey.slice(0, prefix.byteLength))
}
