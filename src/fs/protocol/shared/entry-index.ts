import * as crypto from "../../../crypto/index.js"
import * as namefilters from "../private/namefilter.js"

import type { BareNameFilter, SaturatedNameFilter } from "../private/namefilter.js"
import type { ShareKey } from "./key.js"


export async function namefilter(
  { bareFilter, shareKey }:
  { bareFilter: BareNameFilter, shareKey: ShareKey }
): Promise<SaturatedNameFilter> {
  const hashedKey = await crypto.hash.sha256Str(shareKey)
  return namefilters.saturate(
    await namefilters.addToBare(bareFilter, hashedKey)
  )
}
