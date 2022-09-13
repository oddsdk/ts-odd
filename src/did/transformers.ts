import * as uint8arrays from "uint8arrays"

import { BASE58_DID_PREFIX, magicBytes, parseMagicBytes } from "./util.js"
import { KeyType } from "./types.js"


/**
 * Convert a base64 public key to a DID (did:key).
 */
export function publicKeyToDid(
  publicKey: Uint8Array,
  type: KeyType
): string {
  // Prefix public-write key
  const prefix = magicBytes(type)
  if (prefix === null) {
    throw new Error(`Key type '${type}' not supported`)
  }

  const prefixedBuf = uint8arrays.concat([ prefix, publicKey ])

  // Encode prefixed
  return BASE58_DID_PREFIX + uint8arrays.toString(new Uint8Array(prefixedBuf), "base58btc")
}

/**
 * Convert a DID (did:key) to a base64 public key.
 */
export function didToPublicKey(did: string): {
  publicKey: Uint8Array
  type: KeyType
} {
  if (!did.startsWith(BASE58_DID_PREFIX)) {
    throw new Error("Please use a base58-encoded DID formatted `did:key:z...`")
  }

  const didWithoutPrefix = did.substr(BASE58_DID_PREFIX.length)
  const magicalBuf = uint8arrays.fromString(didWithoutPrefix, "base58btc")
  const { key, type } = parseMagicBytes(magicalBuf)

  return {
    publicKey: key,
    type
  }
}
