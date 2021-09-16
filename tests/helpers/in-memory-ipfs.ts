import * as fs from "fs"
import Ipfs, { IPFS } from "ipfs-core"
import { createRepo } from "ipfs-repo"
import { MemoryDatastore } from "datastore-core/memory"
import { MemoryBlockstore } from "blockstore-core/memory"
import * as dagPb from "@ipld/dag-pb"
import * as dagCbor from "@ipld/dag-cbor"
import { BlockCodec } from "multiformats/codecs/interface"
import tempDir from "ipfs-utils/src/temp-dir.js"


export async function createInMemoryIPFS(): Promise<IPFS> {
  const memoryDs = new MemoryDatastore()
  const memoryBs = new MemoryBlockstore()
  const dir = tempDir()
  fs.mkdirSync(dir)
  return await Ipfs.create({
    offline: true,
    silent: true,
    preload: {
      enabled: false,
    },
    config: {
      Addresses: {
        Swarm: []
      },
    },
    repo: createRepo(
      dir,
      async codeOrName => {
        const lookup: Record<string, BlockCodec<number, unknown>> = {
          [dagPb.code]: dagPb,
          [dagPb.name]: dagPb,
          [dagCbor.code]: dagCbor,
          [dagCbor.name]: dagCbor,
        }
        return lookup[codeOrName]
      },
      {
        root: memoryDs,
        blocks: memoryBs,
        keys: memoryDs,
        datastore: memoryDs,
        pins: memoryDs
      }
    )
  })
}
