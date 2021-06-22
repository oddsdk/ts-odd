
import * as crypto from '../crypto/index'
import * as utils from 'keystore-idb/utils'
import { didToPublicKey } from './transformers'
import { KeyType } from './types'


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

