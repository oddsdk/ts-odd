import * as uint8arrays from "uint8arrays"
import * as iamap from "iamap"
import * as cbor from "cborg"
import { CID } from "multiformats/cid"
import * as Block from "multiformats/block"
import { sha256 } from "multiformats/hashes/sha2"
import * as codec from "@ipld/dag-cbor" // encode blocks using the DAG-CBOR format
import { webcrypto } from "one-webcrypto"

import { PrivateStore, PrivateStoreLookup, PrivateRef } from "./privateNode.js"
import { BlockStore } from "../blockStore.js"
import { hasProp, isCID, isRecord } from "../common.js"


export type HAMT = iamap.IAMap<CID>

/** leafs at the private store HAMT, later encoded as CBOR */
interface PrivateStoreLeaf {
  name: Uint8Array // namefilter
  link: CID
}

function isPrivateStoreLeaf(obj: unknown): obj is PrivateStoreLeaf {
  return isRecord(obj)
    && hasProp(obj, "name") && obj.name instanceof Uint8Array
    && hasProp(obj, "link") && isCID(obj.link)
}

iamap.registerHasher(sha256.code, 32, async input => (await sha256.digest(input)).bytes)


function toHAMTBackingStore(baseBlockStore: BlockStore): iamap.Store<CID> {
  return {
    async load(cid) {
      const bytes = await baseBlockStore.getBlock(cid, {}) // TODO: AbortSignal
      const block = await Block.decode({ bytes: bytes, codec, hasher: sha256 })
      return block.value
    },

    async save(node) {
      const block = await Block.encode({ value: node, codec, hasher: sha256 })
      await baseBlockStore.putBlock(block.bytes, codec, {}) // TODO: AbortSignal
      return block.cid
    },

    isEqual(cid1, cid2) {
      return cid1.equals(cid2)
    },

    isLink(obj) {
      return CID.asCID(obj) != null
    }
  }
}

export async function createHAMT(baseBlockStore: BlockStore): Promise<HAMT> {
  return await iamap.create<CID>(toHAMTBackingStore(baseBlockStore), { hashAlg: sha256.code, bitWidth: 5, bucketSize: 2 })
}


export async function loadHAMT(cid: CID, baseBlockStore: BlockStore): Promise<HAMT> {
  return await iamap.load<CID>(toHAMTBackingStore(baseBlockStore), cid)
}


export function create(hamt: HAMT, baseBlockStore: BlockStore): PrivateStore & { getHAMTSnapshot(): Promise<HAMT> } {

  let currentMap: Promise<HAMT> = Promise.resolve(hamt)

  return {

    async getBlock(ref, { signal }) {
      const alg = ref.algorithm
      const hamtKey = await hamtKeyFromName(ref.namefilter)
      const hamtLeaf = await (await currentMap).get(hamtKey)

      if (hamtLeaf == null) {
        return null
      }

      if (!isPrivateStoreLeaf(hamtLeaf)) {
        throw new Error(`Can't decode HAMT leaf: ${JSON.stringify(hamtLeaf)}`)
      }

      if (!uint8arrays.equals(hamtKey, await hamtKeyFromName(hamtLeaf.name))) {
        throw new Error(`Corrupt block: The key of a block doesn't match the hash of its namefilter.`)
      }

      if (alg !== "AES-GCM") {
        throw new Error(`Can't decrypt private block: Unsupported algorithm "${ref.algorithm}".`)
      }

      const ciphertextWithIV = await baseBlockStore.getBlock(hamtLeaf.link, { signal })

      if (ciphertextWithIV.byteLength < 16) {
        throw new Error(`Can't decrypt private block: Expected at least 16 bytes. Instead got ${ciphertextWithIV.byteLength} bytes.`)
      }

      const iv = ciphertextWithIV.slice(0, 16)
      const ciphertext = ciphertextWithIV.slice(16)

      const cleartext: ArrayBuffer = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, await keyFromRef(ref), ciphertext)
      return new Uint8Array(cleartext)
    },

    async putBlock(ref, block, { signal }) {
      const alg = ref.algorithm
      if (alg !== "AES-GCM") {
        throw new Error(`Can't decrypt private block: Unsupported algorithm "${ref.algorithm}".`)
      }

      const iv = webcrypto.getRandomValues(new Uint8Array(16))
      const ciphertext: ArrayBuffer = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFromRef(ref), block)
      const ciphertextWithIV = uint8arrays.concat([iv, new Uint8Array(ciphertext)])
      const blockCID = await baseBlockStore.putBlock(ciphertextWithIV, codec, { signal })
      const blockNode = {
        name: ref.namefilter,
        link: blockCID, // TODO Multivalue. May need a change to the privateStore interface
      }

      const mapBefore = currentMap
      currentMap = (async () => {
        const map = await mapBefore
        return await map.set(await hamtKeyFromName(ref.namefilter), blockNode)
      })()
      await currentMap
    },

    async getHAMTSnapshot() {
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

async function hamtKeyFromName(namefilter: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await webcrypto.subtle.digest("sha-256", namefilter))
}
