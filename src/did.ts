import * as base58 from 'base58-universal/main.js'

import * as crypto from './crypto'
import * as storage from './storage'
import * as utils from 'keystore-idb/utils'

import * as dns from './dns'
import { arrbufs, isString, USERNAME_STORAGE_KEY } from './common'
import { setup } from './setup/internal'


const EDWARDS_DID_PREFIX = new Uint8Array([ 0xed, 0x01 ])
const BLS_DID_PREFIX = new Uint8Array([ 0xea, 0x01 ])
const RSA_DID_PREFIX = new Uint8Array([ 0x00, 0xf5, 0x02 ])
const BASE58_DID_PREFIX = 'did:key:z'

export enum KeyType {
  RSA = 'rsa',
  Edwards = 'ed25519',
  BLS = 'bls12-381'
}



// KINDS


/**
 * Create a DID based on the exchange key-pair.
 */
export async function exchange(): Promise<string> {
  const pubKeyB64 = await crypto.keystore.publicReadKey()
  const ksAlg = await crypto.keystore.getAlg()

  return publicKeyToDid(
    pubKeyB64,
    toKeyType(ksAlg)
  )
}

/**
 * Get the root write-key DID for a user.
 * Stored at `_did.${username}.${endpoints.user}`
 */
export async function root(
  username: string
): Promise<string> {
  const domain = setup.endpoints.user

  try {
    const maybeDid = await dns.lookupTxtRecord(`_did.${username}.${domain}`)
    if (maybeDid !== null) return maybeDid
  } catch (_err) { 
    // lookup failed
  }

  throw new Error("Could not locate user DID in DNS.")
}

/**
 * Get a user's own root write-key DID.
 * Stored at `_did.${username}.${endpoints.user}`
 */
export async function ownRoot(): Promise<string> {
  const username = await storage.getItem(USERNAME_STORAGE_KEY)
  if(!isString(username)) {
    throw new Error("No logged in user")
  }
  return root(username)
}

/**
 * Alias `write` to `ucan`
 */
export { write as ucan }

/**
 * Create a DID based on the write key-pair.
 */
export async function write(): Promise<string> {
  const pubKeyB64 = await crypto.keystore.publicWriteKey()
  const ksAlg = await crypto.keystore.getAlg()

  return publicKeyToDid(
    pubKeyB64,
    toKeyType(ksAlg)
  )
}



// TRANSFORMERS


/**
 * Convert a base64 public key to a DID (did:key).
 */
export function publicKeyToDid(
  publicKey: string,
  type: KeyType
): string {
  const pubKeyBuf = utils.base64ToArrBuf(publicKey)

  // Prefix public-write key
  const prefix = magicBytes(type)
  if (prefix === null) {
    throw new Error(`Key type '${type}' not supported`)
  }

  const prefixedBuf = utils.joinBufs(prefix, pubKeyBuf)

  // Encode prefixed
  return BASE58_DID_PREFIX + base58.encode(new Uint8Array(prefixedBuf))
}

/**
 * Convert a DID (did:key) to a base64 public key.
 */
export function didToPublicKey(did: string): {
  publicKey: string
  type: KeyType
} {
  if (!did.startsWith(BASE58_DID_PREFIX)) {
    throw new Error("Please use a base58-encoded DID formatted `did:key:z...`")
  }

  const didWithoutPrefix = did.substr(BASE58_DID_PREFIX.length)
  const magicalBuf = base58.decode(didWithoutPrefix)
  const { keyBuffer, type } = parseMagicBytes(magicalBuf)

  return {
    publicKey: utils.arrBufToBase64(keyBuffer),
    type
  }
}



// VALIDATION


/**
 * Verify the signature of some data (string, ArrayBuffer or Uint8Array), given a DID.
 */
export async function verifySignedData({ charSize = 16, data, did, signature }: {
  charSize?: number
  data: string
  did: string
  signature: string
}): Promise<boolean> {
  try {
    const { type, publicKey } = didToPublicKey(did)

    const sigBytes = new Uint8Array(utils.base64ToArrBuf(signature))
    const dataBytes = new Uint8Array(utils.normalizeUnicodeToBuf(data, charSize))
    const keyBytes = new Uint8Array(utils.base64ToArrBuf(publicKey))

    switch (type) {

      case KeyType.Edwards:
        return await crypto.ed25519.verify(dataBytes, sigBytes, keyBytes)

      case KeyType.RSA: 
        return await crypto.rsa.verify(dataBytes, sigBytes, keyBytes)

      default: return false
    }

  } catch (_) {
    return false

  }
}



// ㊙️


/**
 * Magic bytes.
 */
function magicBytes(keyType: KeyType): Uint8Array | null {
  switch (keyType) {
    case KeyType.Edwards: return EDWARDS_DID_PREFIX;
    case KeyType.RSA: return RSA_DID_PREFIX;
    case KeyType.BLS: return BLS_DID_PREFIX;
    default: return null
  }
}

/**
 * Parse magic bytes on prefixed key-buffer
 * to determine cryptosystem & the unprefixed key-buffer.
 */
const parseMagicBytes = (prefixedKey: Uint8Array): {
  keyBuffer: Uint8Array
  type: KeyType
} => {
  // RSA
  if (hasPrefix(prefixedKey, RSA_DID_PREFIX)) {
    return {
      keyBuffer: prefixedKey.slice(RSA_DID_PREFIX.byteLength),
      type: KeyType.RSA
    }

  // EDWARDS
  } else if (hasPrefix(prefixedKey, EDWARDS_DID_PREFIX)) {
    return {
      keyBuffer: prefixedKey.slice(EDWARDS_DID_PREFIX.byteLength),
      type: KeyType.Edwards
    }

  // BLS
  } else if (hasPrefix(prefixedKey, BLS_DID_PREFIX)) {
    return {
      keyBuffer: prefixedKey.slice(BLS_DID_PREFIX.byteLength),
      type: KeyType.BLS
    }

  }

  throw new Error("Unsupported key algorithm. Try using RSA.")
}

/**
 * Determines if an ArrayBuffer has a given indeterminate length-prefix.
 */
const hasPrefix = (prefixedKey: ArrayBuffer, prefix: ArrayBuffer): boolean => {
  return arrbufs.equal(prefix, prefixedKey.slice(0, prefix.byteLength))
}

const toKeyType = (str: string): KeyType => {
  switch(str) {
    case 'rsa': return KeyType.RSA
    case 'ed25519': return KeyType.Edwards
    case 'bls12-381': return KeyType.BLS
  }
  throw new Error(`Key Type ${str} not supported`)
}
