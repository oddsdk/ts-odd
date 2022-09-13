import * as crypto from "../crypto/index.js"
import { didToPublicKey } from "./transformers.js"
import { KeyType } from "./types.js"


/**
 * Verify the signature of some data (string, ArrayBuffer or Uint8Array), given a DID.
 */
export async function verifySignedData({ data, did, signature }: {
  data: Uint8Array
  did: string
  signature: Uint8Array
}): Promise<boolean> {
  try {
    const { type, publicKey } = didToPublicKey(did)
    switch (type) {

      case KeyType.Edwards:
        return await crypto.ed25519.verify(data, signature, publicKey)

      case KeyType.RSA:
        return await crypto.rsa.verify(data, signature, publicKey)

      default: return false
    }

  } catch (_) {
    return false

  }
}
