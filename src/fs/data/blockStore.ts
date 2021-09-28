import type { IPFS } from "ipfs-core"

import { CID } from "multiformats/cid"
import { AbortContext } from "./common.js"
import { sha256 } from "multiformats/hashes/sha2"

export interface BlockStore {
  putBlock(bytes: Uint8Array, codec: { code: number, name: string }, options: AbortContext): Promise<CID>
  getBlock(cid: CID, options: AbortContext): Promise<Uint8Array>
}


export function createMemoryBlockStore(): BlockStore {
  const memoryMap = new Map<string, Uint8Array>()

  async function getBlock(cid: CID): Promise<Uint8Array> {
    const block = memoryMap.get(cid.toString())
    if (block == null) {
      throw new Error(`Memory Block Store: Couldn't find block with cid: ${cid.toString()}`)
    }
    return block
  }

  return {

    getBlock,

    async putBlock(bytes, codec) {
      const hash = await sha256.digest(bytes)
      const cid = CID.createV1(codec.code, hash)
      memoryMap.set(cid.toString(), bytes)
      return cid
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
      return await ipfs.block.put(bytes, { version: 1, format: codec.name, mhtype: "sha2-256", pin: false, signal })
    },

  }
}
