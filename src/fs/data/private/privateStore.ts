import type { IPFS } from "ipfs-core"

import * as uint8arrays from "uint8arrays"
import * as iamap from "iamap"
import { CID } from "multiformats/cid"
import * as Block from "multiformats/block"
import { sha256 } from "multiformats/hashes/sha2"
import * as codec from "@ipld/dag-cbor" // encode blocks using the DAG-CBOR format

import { PrivateStore, PrivateStoreLookup, PrivateRef } from "./privateNode.js"

export function create(ipfs: IPFS): PrivateStore & { getBackingIAMap(): Promise<iamap.IAMap<CID>> } {
  iamap.registerHasher(sha256.code, 32, async input => (await sha256.digest(input)).bytes)

  let currentMap = iamap.create<CID>({
    async load(cid) {
      const bytes = await ipfs.block.get(cid.toString())
      const block = await Block.decode({ bytes: bytes.data, codec, hasher: sha256 })
      return block.value
    },

    // @ts-ignore (incorrectly specified type)
    async save(node) {
      const block = await Block.encode({ value: node, codec, hasher: sha256 })
      await ipfs.block.put(block.bytes)
      return block.cid
    },

    isEqual(cid1, cid2) {
      return cid1.equals(cid2)
    },

    isLink(obj) {
      return CID.asCID(obj) != null
    }
  }, { hashAlg: sha256.code, bitWidth: 8, bucketSize: 2 })

  return {

    async getBlock(ref) {
      const value = await (await currentMap).get(ref.namefilter)
      return value || null
    },

    async putBlock(ref, block) {
      const mapBefore = currentMap
      currentMap = (async () => {
        const map = await mapBefore
        return await map.set(ref.namefilter, block)
      })()
      await currentMap
    },

    async getBackingIAMap() {
      return await currentMap
    }

  }
}

export function empty(): PrivateStoreLookup {
  return {
    async getBlock() {
      return null
    }
  }
}


export function createInMemory(base: PrivateStoreLookup): PrivateStore {
  const memoryMap = new Map<string, { ref: PrivateRef; block: Uint8Array }>()
  const keyForRef = (ref: PrivateRef) => uint8arrays.toString(ref.namefilter, "base64url")
  return {

    async getBlock(ref, ctx) {
      // No need to decrypt if you never encrypt <insert tapping head meme>
      const key = keyForRef(ref)
      const block = memoryMap.get(key)?.block
      if (block == null) {
        return await base.getBlock(ref, ctx)
      }
      return block
    },

    async putBlock(ref, block) {
      // Don't encrypt
      const key = keyForRef(ref)
      if (memoryMap.has(key)) {
        throw new Error("Can't overwrite key! Append-only!")
      }
      memoryMap.set(key, { ref, block })
    }

  }
}