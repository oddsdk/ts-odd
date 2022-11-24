import * as Uint8arrays from "uint8arrays"

import * as Crypto from "../../../components/crypto/implementation.js"
import { Opaque } from "../../../common/types.js"


export type ShareKey = Opaque<"ShareKey", string>


/**
 * Creates a share key.
 */
export async function create(
  crypto: Crypto.Implementation,
  { counter, recipientExchangeDid, senderRootDid }:
    { counter: number, recipientExchangeDid: string, senderRootDid: string }
): Promise<string> {
  const bytes = Uint8arrays.fromString(`${recipientExchangeDid}${senderRootDid}${counter}`, "utf8")

  return Uint8arrays.toString(
    await crypto.hash.sha256(bytes),
    "base64pad"
  )
}


/**
 * Creates the payload for a share key.
 */
export function payload(
  { entryIndexCid, symmKey, symmKeyAlgo }:
    { entryIndexCid: string, symmKey: string | Uint8Array, symmKeyAlgo: string }
): { algo: string, key: Uint8Array, cid: string } {
  const cid = entryIndexCid

  return {
    algo: symmKeyAlgo,
    key: typeof symmKey === "string"
      ? Uint8arrays.fromString(symmKey, "base64pad")
      : symmKey,
    cid
  }
}
