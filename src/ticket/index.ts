import * as Raw from "multiformats/codecs/raw"
import { sha256 } from "multiformats/hashes/sha2"
import * as Uint8Arrays from "uint8arrays"

import { CID } from "../common/cid.js"
import { Ticket } from "./types.js"

////////
// 🛠️ //
////////

export async function cid(ticket: Ticket): Promise<CID> {
  const multihash = await sha256.digest(
    Uint8Arrays.fromString(ticket.token, "utf8")
  )

  return CID.createV1(Raw.code, multihash)
}
