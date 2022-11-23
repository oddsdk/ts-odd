import * as uint8arrays from "uint8arrays"
import * as Crypto from "../components/crypto/implementation.js"

import { BASE58_DID_PREFIX, hasPrefix } from "./util.js"


/**
 * Convert a base64 public key to a DID (did:key).
 */
export function publicKeyToDid(
  crypto: Crypto.Implementation,
  publicKey: Uint8Array,
  keyType: string
): string {
  // Prefix public-write key
  const prefix = crypto.did.keyTypes[ keyType ]?.magicBytes
  if (prefix === null) {
    throw new Error(`Key type '${keyType}' not supported, available types: ${Object.keys(crypto.did.keyTypes).join(", ")}`)
  }

  const prefixedBuf = uint8arrays.concat([ prefix, publicKey ])

  // Encode prefixed
  return BASE58_DID_PREFIX + uint8arrays.toString(prefixedBuf, "base58btc")
}

/**
 * Convert a DID (did:key) to a base64 public key.
 */
export function didToPublicKey(crypto: Crypto.Implementation, did: string): {
  publicKey: Uint8Array
  type: string
} {
  if (!did.startsWith(BASE58_DID_PREFIX)) {
    throw new Error("Please use a base58-encoded DID formatted `did:key:z...`")
  }

  const didWithoutPrefix = did.substr(BASE58_DID_PREFIX.length)
  const magicalBuf = uint8arrays.fromString(didWithoutPrefix, "base58btc")
  const result = Object.entries(crypto.did.keyTypes).find(
    ([ _key, attr ]) => hasPrefix(magicalBuf, attr.magicBytes)
  )

  if (!result) {
    throw new Error("Unsupported key algorithm.")
  }

  return {
    publicKey: magicalBuf.slice(result[ 1 ].magicBytes.length),
    type: result[ 0 ]
  }
}
