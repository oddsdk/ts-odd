import { Blockstore } from "interface-blockstore"
import { CID } from "multiformats/cid"

import { CodecIdentifier } from "../../dag/codecs.js"
import { Ucan } from "../../ucan/index.js"


export type Implementation = {
  blockstore: Blockstore

  // Get the data behind a CID
  getBlock: (cid: CID) => Promise<Uint8Array>

  // Keep data around
  putBlock: (data: Uint8Array, codec: CodecIdentifier) => Promise<CID>

  // Flush, called when the data root is updated (storage of top-level fs pointer).
  // Here you could set up an IPFS peer connection,
  // or simply push all "changed" blocks to some other block store.
  flush: (dataRoot: CID, proofs: Ucan[]) => Promise<void>
}
