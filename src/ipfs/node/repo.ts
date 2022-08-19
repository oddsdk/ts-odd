import * as dagPB from "@ipld/dag-pb"
import { createRepo, Datastore, IPFSRepo } from "ipfs-repo"
import { BlockCodec } from "multiformats/codecs/interface"
import { BlockstoreDatastoreAdapter } from "blockstore-datastore-adapter"
import { LevelDatastore } from "datastore-level"
import { MemoryDatastore } from "datastore-core/memory"


export function create(): IPFSRepo {
  const memoryDs = new MemoryDatastore()

  return createRepo(
    "fission-ipfs",
    codeOrName => {
      const lookup: Record<string, BlockCodec<number, unknown>> = {
        [dagPB.code]: dagPB,
        [dagPB.name]: dagPB
      }

      return Promise.resolve(lookup[codeOrName])
    }, {
      root: new LevelDatastore("fission-ipfs/root", { prefix: "", version: 2 }),
      blocks: new BlockstoreDatastoreAdapter(new LevelDatastore("fission-ipfs/blocks", { prefix: "", version: 2 })),
      keys: new LevelDatastore("fission-ipfs/keys", { prefix: "", version: 2 }),
      datastore: memoryDs,
      pins: new LevelDatastore("fission-ipfs/pins", { prefix: "", version: 2 }),
    }, {
      repoLock: {
        lock: async () => ({ close: async () => { return } }),
        locked: async () => false
      },
      autoMigrate: false,
    }
  )
}
