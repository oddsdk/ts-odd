import { BlockstoreDatastoreAdapter } from "blockstore-datastore-adapter"
import { LevelDatastore } from "datastore-level"

import { CID } from "multiformats/cid"
import { sha256 } from "multiformats/hashes/sha2"

import * as Codecs from "../../dag/codecs.js"
import { CodecIdentifier } from "../../dag/codecs.js"
import { Ucan } from "../../ucan/index.js"
import { Implementation } from "./implementation.js"

// 🛳

export type ImplementationOptions = {
  blockstoreName: string
}

export async function implementation(
  { blockstoreName }: ImplementationOptions
): Promise<Implementation> {
  const blockstore = new BlockstoreDatastoreAdapter(
    new LevelDatastore(blockstoreName, { prefix: "" })
  )

  // Implementation
  // --------------
  return {
    blockstore,

    // GET

    getBlock: async (cid: CID): Promise<Uint8Array> => {
      if (await blockstore.has(cid)) return blockstore.get(cid)
      throw new Error(`Blockstore doesn't have this CID: ${cid.toString()}`)
    },

    // PUT

    putBlock: async (data: Uint8Array, codecId: CodecIdentifier): Promise<CID> => {
      const codec = Codecs.getByIdentifier(codecId)
      const multihash = await sha256.digest(data)
      const cid = CID.createV1(codec.code, multihash)

      await blockstore.put(cid, data)

      return cid
    },

    // FLUSH

    flush: async (_dataRoot: CID, _proofs: Ucan[]): Promise<void> => {},
  }
}
