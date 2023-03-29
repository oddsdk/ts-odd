import { Blockstore } from "interface-blockstore"
import { CID } from "multiformats/cid"

import { CodecIdentifier } from "../../dag/codecs.js"


export type Implementation = {
  blockstore: Blockstore

  // Get the data behind a CID
  getBlock: (cid: CID) => Promise<Uint8Array>

  // Keep data around
  putBlock: (data: Uint8Array, codec: CodecIdentifier) => Promise<CID>
}
