import type { IPFS } from "ipfs-core"

import { CID } from "multiformats/cid"
import { sha256 } from "multiformats/hashes/sha2"

import { AbortContext } from "./common.js"


export interface BlockStoreLookup {
  getBlock(cid: CID, options: AbortContext): Promise<Uint8Array>
}

export interface BlockStore extends BlockStoreLookup {
  putBlock(bytes: Uint8Array, codec: { code: number; name: string }, options: AbortContext): Promise<CID>
}

export interface MemoryBlockStore extends BlockStore {
  addedEntries(): Iterator<CID, void>
}


export function emptyBlockStore(): BlockStoreLookup {
  return {
    async getBlock(cid) {
      throw new Error(`Couldn't find block with cid: ${cid.toString()}`)
    }
  }
}


export function createMemoryBlockStore(base: BlockStoreLookup = emptyBlockStore()): MemoryBlockStore {
  const memoryMap = new Map<string, Uint8Array>()

  return {
    async getBlock(cid, ctx) {
      const block = memoryMap.get(cid.toString())
      if (block == null) {
        return base.getBlock(cid, ctx)
      }
      return block
    },

    async putBlock(bytes, codec) {
      const hash = await sha256.digest(bytes)
      const cid = CID.createV1(codec.code, hash)
      memoryMap.set(cid.toString(), bytes)
      return cid
    },

    addedEntries: function*() {
      for (const key of memoryMap.keys()) {
        yield CID.parse(key)
      }
    },
  }
}


export function createIPFSBlockStore(ipfs: IPFS): BlockStore {
  return {
    async getBlock(cid, { signal }) {
      const block = await ipfs.block.get(cid, { signal })
      return block
    },

    async putBlock(bytes, codec, { signal }) {
      return await ipfs.block.put(bytes, {
        version: 1, // CID V1
        format: codec.name,
        mhtype: "sha2-256",
        pin: false, // We never GC anyway. And if we do, we can pin relevant structures before GCing
        signal
      })
    },
  }
}
