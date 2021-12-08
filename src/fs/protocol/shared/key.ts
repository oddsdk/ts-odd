import * as uint8arrays from "uint8arrays"

import { Opaque } from "../../../common/types.js"
import { sha256Str } from "../../../crypto/index.js"


export type ShareKey = Opaque<"ShareKey", string>


/**
 * Creates a share key.
 */
export function create(
  { counter, recipientExchangeDid, senderRootDid }:
  { counter: number, recipientExchangeDid: string, senderRootDid: string }
): Promise<string> {
  return sha256Str(`${recipientExchangeDid}${senderRootDid}${counter}`)
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
      ? uint8arrays.fromString(symmKey, "base64pad")
      : symmKey,
    cid
  }
}
