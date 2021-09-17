import type { IPFS } from "ipfs-core"

import { CID } from "multiformats/cid"
import { AbortContext } from "./common.js"
import { sha256 } from "multiformats/hashes/sha2"
import * as dagPB from "@ipld/dag-pb"

export interface BlockStore {
  putBlock(bytes: Uint8Array, options: AbortContext): Promise<CID>
  getBlock(cid: CID, options: AbortContext): Promise<Uint8Array>
}


export function createMemoryBlockStore(): BlockStore {
  const memoryMap = new Map<string, Uint8Array>()

  return {

    async getBlock(cid) {
      const block = memoryMap.get(cid.toString())
      if (block == null) {
        throw new Error(`Memory Block Store: Couldn't find block with cid: ${cid.toString()}`)
      }
      return block
    },

    async putBlock(bytes) {
      const hash = await sha256.digest(bytes)
      const cid = CID.createV1(dagPB.code, hash)
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

    async putBlock(bytes, { signal }) {
      return await ipfs.block.put(bytes, { version: 1, format: "dag-pb", mhtype: "sha2-256", pin: false, signal })
    },
  }
}