import * as Uint8arrays from "uint8arrays"

import * as Crypto from "../../../components/crypto/implementation.js"
import * as Namefilters from "../private/namefilter.js"

import type { BareNameFilter, SaturatedNameFilter } from "../private/namefilter.js"
import type { ShareKey } from "./key.js"


export async function namefilter(
  crypto: Crypto.Implementation,
  { bareFilter, shareKey }:
    { bareFilter: BareNameFilter, shareKey: ShareKey }
): Promise<SaturatedNameFilter> {
  const hashedKey = await crypto.hash.sha256(
    Uint8arrays.fromString(shareKey, "base64pad")
  )

  return Namefilters.saturate(
    crypto,
    await Namefilters.addToBare(
      crypto,
      bareFilter,
      Namefilters.legacyEncodingMistake(hashedKey, "hex")
    )
  )
}
