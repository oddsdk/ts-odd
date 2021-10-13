import * as crypto from "../crypto/index.js"
import { publicKeyToDid } from "./transformers.js"
import { toKeyType } from "./util.js"


/**
 * Create a DID based on the exchange key-pair.
 */
export async function exchange(): Promise<string> {
  const pubKeyB64 = await crypto.keystore.publicExchangeKey()
  const ksAlg = await crypto.keystore.getAlg()

  return publicKeyToDid(
    pubKeyB64,
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
export async function write(): Promise<string> {
  const pubKeyB64 = await crypto.keystore.publicWriteKey()
  const ksAlg = await crypto.keystore.getAlg()

  return publicKeyToDid(
    pubKeyB64,
    toKeyType(ksAlg)
  )
}
