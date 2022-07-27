import type { IPFS } from "ipfs-core"

import * as fs from "fs"
import * as Ipfs from "ipfs-core"
import tempDir from "ipfs-utils/src/temp-dir.js"
import { createRepo } from "ipfs-repo"
import { MemoryDatastore } from "datastore-core/memory"
import { MemoryBlockstore } from "blockstore-core/memory"

// Codecs
import * as dagPB from "@ipld/dag-pb"
import * as dagCBOR from "@ipld/dag-cbor"
import * as raw from "multiformats/codecs/raw"
import { BlockCodec } from "multiformats/codecs/interface"

const CODECS: Record<string, BlockCodec<number, unknown>> = {
  [dagPB.code]: dagPB,
  [dagPB.name]: dagPB,
  [dagCBOR.code]: dagCBOR,
  [dagCBOR.name]: dagCBOR,
  [raw.code]: raw,
  [raw.name]: raw,
}

export async function createInMemoryIPFS(): Promise<IPFS> {
  const dir = tempDir()
  fs.mkdirSync(dir)

  const memoryDs = new MemoryDatastore()
  const memoryBs = new MemoryBlockstore()

  return await Ipfs.create({
    offline: true,
    silent: true,
    preload: {
      enabled: false,
    },
    config: {
      Addresses: {
        Swarm: ["/ip4/0.0.0.0/tcp/4002"],
        API: "/ip4/127.0.0.1/tcp/5002",
        Gateway: "/ip4/127.0.0.1/tcp/9090"
      },
      Discovery: {
        MDNS: {
          Enabled: false
        },
        webRTCStar: {
          Enabled: false
        }
      }
    },
    libp2p: {
      peerStore: {
        persistence: false
      },
      config: {
        peerDiscovery: {
          autoDial: false
        }
      }
    },
    repo: createRepo(
      dir,
      codeOrName => Promise.resolve(CODECS[codeOrName]), {
      root: memoryDs,
      blocks: memoryBs,
      keys: memoryDs,
      datastore: memoryDs,
      pins: memoryDs
    }, {
      repoLock: {
        lock: async () => ({ close: async () => { return } }),
        locked: async () => false
      },
      autoMigrate: false,
    }
    )
  })
}
