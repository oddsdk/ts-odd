import * as Crypto from "../components/crypto/implementation.js"

import { publicKeyToDid } from "./transformers.js"
import { toKeyType } from "./util.js"


/**
 * Create a DID based on the exchange key-pair.
 */
export async function exchange(crypto: Crypto.Implementation): Promise<string> {
  const pubKey = await crypto.keystore.publicExchangeKey()
  const ksAlg = await crypto.keystore.getAlg()

  return publicKeyToDid(
    pubKey,
    toKeyType(ksAlg)
  )
}

/**
 * Alias `write` to `ucan`
 */
export { write as ucan }

/**
 * Create a DID based on the write key-pair.
 */
export async function write(crypto: Crypto.Implementation): Promise<string> {
  const pubKey = await crypto.keystore.publicWriteKey()
  const ksAlg = await crypto.keystore.getAlg()

  return publicKeyToDid(
    pubKey,
    toKeyType(ksAlg)
  )
}
