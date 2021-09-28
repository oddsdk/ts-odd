import type { IPFS } from "ipfs-core"

import { CID } from "multiformats/cid"
import { AbortContext } from "./common.js"
import { sha256 } from "multiformats/hashes/sha2"
import * as dagPB from "@ipld/dag-pb"

export interface BlockStore {
  putBlock(bytes: Uint8Array, options: AbortContext): Promise<CID>
  getBlock(cid: CID, options: AbortContext): Promise<Uint8Array>
  blockSize(cid: CID, options: AbortContext): Promise<number>
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

    async putBlock(bytes) {
      const hash = await sha256.digest(bytes)
      const cid = CID.createV1(dagPB.code, hash)
      memoryMap.set(cid.toString(), bytes)
      return cid
    },

    async blockSize(cid) {
      const block = await getBlock(cid)
      try {
        const node = dagPB.decode(block)
        const linkSizeSum = node.Links.map(l => l.Tsize || 0).reduce((a, b) => a + b, 0)
        return block.byteLength + linkSizeSum
      } catch {
        console.log(`Couldn't do it (in-memory) for ${cid.toString()}`)
        return 0
      }
    }

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

    async blockSize(cid, { signal }) {
      try {

        // TODO: This should actually be equivalent to: (await ipfs.dag.get(cid, { signal })).value.Size
        const stat = await ipfs.files.stat(cid, { signal })
        return stat.cumulativeSize
      } catch {
        console.log(`Couldn't do it for ${cid.toString()}`)
        return 0
      }
    }
  }
}
