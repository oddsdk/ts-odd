import * as base58 from 'base58-universal/main.js'
import { CryptoSystem, Msg } from 'keystore-idb/types'

import eccOperations from 'keystore-idb/ecc/operations'
import rsaOperations from 'keystore-idb/rsa/operations'
import utils from 'keystore-idb/utils'

import * as dns from './dns'
import * as keystore from './keystore'
import { arrbufs } from './common'
import { setup } from './setup/internal'


const ECC_DID_PREFIX: ArrayBuffer = new Uint8Array([ 0xed, 0x01 ]).buffer
const RSA_DID_PREFIX: ArrayBuffer = new Uint8Array([ 0x00, 0xf5, 0x02 ]).buffer
const BASE58_DID_PREFIX: string = 'did:key:z'



// KINDS


/**
 * Create a DID based on the exchange key-pair.
 */
export async function exchange(): Promise<string> {
  const ks = await keystore.get()
  const pubKeyB64 = await ks.publicReadKey()

  return publicKeyToDid(pubKeyB64, ks.cfg.type)
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
  } catch (_err) {}

  throw new Error("Could not locate user DID in DNS.")
}

/**
 * Alias `write` to `ucan`
 */
export { write as ucan }

/**
 * Create a DID based on the write key-pair.
 */
export async function write(): Promise<string> {
  const ks = await keystore.get()
  const pubKeyB64 = await ks.publicWriteKey()

  return publicKeyToDid(pubKeyB64, ks.cfg.type)
}



// TRANSFORMERS


/**
 * Convert a base64 public key to a DID (did:key).
 */
export function publicKeyToDid(
  publicKey: string,
  type: CryptoSystem
): string {
  const pubKeyBuf = utils.base64ToArrBuf(publicKey)

  // Prefix public-write key
  const prefix = magicBytes(type) || new ArrayBuffer(0)
  const prefixedBuf = utils.joinBufs(prefix, pubKeyBuf)

  // Encode prefixed
  return BASE58_DID_PREFIX + base58.encode(new Uint8Array(prefixedBuf))
}

/**
 * Convert a DID (did:key) to a base64 public key.
 */
export function didToPublicKey(did: string): {
  publicKey: string,
  type: CryptoSystem
} {
  if (!did.startsWith(BASE58_DID_PREFIX)) {
    throw new Error("Please use a base58-encoded DID formatted `did:key:z...`")
  }

  const didWithoutPrefix = did.substr(BASE58_DID_PREFIX.length)
  const magicalBuf = base58.decode(didWithoutPrefix).buffer as ArrayBuffer
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
export async function verifySignedData({ data, did, signature }: {
  data: Msg,
  did: string
  signature: string
}): Promise<boolean> {
  try {
    const { type, publicKey } = didToPublicKey(did)

    switch (type) {
      case "ecc": return await eccOperations.verify(
        data,
        signature,
        publicKey
      )

      case "rsa": return await rsaOperations.verify(
        data,
        signature,
        publicKey
      )

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
function magicBytes(cryptoSystem: CryptoSystem): ArrayBuffer | null {
  switch (cryptoSystem) {
    case CryptoSystem.RSA: return RSA_DID_PREFIX;
    default: return null
  }
}

/**
 * Parse magic bytes on prefixed key-buffer
 * to determine cryptosystem & the unprefixed key-buffer.
 */
const parseMagicBytes = (prefixedKey: ArrayBuffer): {
  keyBuffer: ArrayBuffer
  type: CryptoSystem
} => {
  // RSA
  if (hasPrefix(prefixedKey, RSA_DID_PREFIX)) {
    return {
      keyBuffer: prefixedKey.slice(RSA_DID_PREFIX.byteLength),
      type: CryptoSystem.RSA
    }

  // ECC
  } else if (hasPrefix(prefixedKey, ECC_DID_PREFIX)) {
    return {
      keyBuffer: prefixedKey.slice(ECC_DID_PREFIX.byteLength),
      type: CryptoSystem.ECC
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
