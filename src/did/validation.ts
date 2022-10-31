import * as Crypto from "../components/crypto/implementation.js"

import { didToPublicKey } from "./transformers.js"
import { KeyType } from "./types.js"


/**
 * Verify the signature of some data given a DID.
 */
export async function verifySignedData({ data, dependents, did, signature }: {
  data: Uint8Array
  dependents: { crypto: Crypto.Implementation }
  did: string
  signature: Uint8Array
}): Promise<boolean> {
  try {
    const { type, publicKey } = didToPublicKey(did)
    switch (type) {

      case KeyType.Edwards:
        return await dependents.crypto.ed25519.verify(data, signature, publicKey)

      case KeyType.RSA:
        return await dependents.crypto.rsa.verify(data, signature, publicKey)

      default: return false
    }

  } catch (_) {
    return false

  }
}
