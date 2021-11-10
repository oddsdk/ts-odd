import type { IPFS } from "ipfs-core"

import * as uint8arrays from "uint8arrays"
import * as iamap from "iamap"
import { CID } from "multiformats/cid"
import * as Block from "multiformats/block"
import { sha256 } from "multiformats/hashes/sha2"
import * as codec from "@ipld/dag-cbor" // encode blocks using the DAG-CBOR format
import { webcrypto } from "one-webcrypto"

import { PrivateStore, PrivateStoreLookup, PrivateRef } from "./privateNode.js"

export function create(ipfs: IPFS): PrivateStore & { getBackingIAMap(): Promise<iamap.IAMap<CID>> } {
  iamap.registerHasher(sha256.code, 32, async input => (await sha256.digest(input)).bytes)

  let currentMap = iamap.create<CID>({
    async load(cid) {
      const bytes = await ipfs.block.get(cid)
      const block = await Block.decode({ bytes: bytes, codec, hasher: sha256 })
      return block.value
    },

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
  }, { hashAlg: sha256.code, bitWidth: 5, bucketSize: 2 })

  return {

    async getBlock(ref) {
      if (ref.algorithm !== "AES-GCM") {
        throw new Error(`Can't decrypt private block: Unsupported algorithm "${ref.algorithm}".`)
      }

      const encryptedBlock: Uint8Array = await (await currentMap).get(ref.namefilter)

      if (encryptedBlock == null) {
        return null
      }

      if (encryptedBlock.byteLength < 16) {
        throw new Error(`Can't decrypt private block: Must be at least 16 bytes long to contain an iv. Instead got length ${encryptedBlock.byteLength}`)
      }

      const iv = encryptedBlock.slice(0, 16)
      const ciphertext = encryptedBlock.slice(16)

      const cleartext: ArrayBuffer = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, await keyFromRef(ref), ciphertext)
      return new Uint8Array(cleartext)
    },

    async putBlock(ref, block) {
      if (ref.algorithm !== "AES-GCM") {
        throw new Error(`Can't decrypt private block: Unsupported algorithm "${ref.algorithm}".`)
      }

      const iv = webcrypto.getRandomValues(new Uint8Array(16))
      const ciphertext: ArrayBuffer = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFromRef(ref), block)

      const encryptedBlock = uint8arrays.concat([iv, new Uint8Array(ciphertext)])

      const mapBefore = currentMap
      currentMap = (async () => {
        const map = await mapBefore
        return await map.set(ref.namefilter, encryptedBlock)
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


export function createInMemoryUnencrypted(base: PrivateStoreLookup): PrivateStore & { getMap: () => Map<string, { ref: PrivateRef; block: Uint8Array }> } {
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
    },

    getMap(): typeof memoryMap {
      return memoryMap
    }

  }
}

async function keyFromRef(ref: PrivateRef): Promise<CryptoKey> {
  // TODO: Detect when ref.algorithm is not AES-GCM and error out fittingly!
  return await webcrypto.subtle.importKey("raw", ref.key, { name: ref.algorithm }, true, ["encrypt", "decrypt"])
}