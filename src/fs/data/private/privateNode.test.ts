import expect from "expect"
import * as fc from "fast-check"
import * as uint8arrays from "uint8arrays"

import * as privateNode from "./privateNode.js"
import * as namefilter from "./namefilter.js"
import * as ratchet from "./spiralratchet.js"
import * as bloom from "./bloomfilter.js"


function createMemoryPrivateStore(): privateNode.PrivateStore {
  const memoryMap = new Map<string, Uint8Array>()
  const keyForRef = (ref: privateNode.PrivateRef) => uint8arrays.toString(ref.namefilter, "base64url")
  return {

    async getBlock(ref) {
      // No need to decrypt if you never encrypt <insert tapping head meme>
      const key = keyForRef(ref)
      return memoryMap.get(key) || null
    },

    async putBlock(ref, block) {
      // Don't encrypt
      const key = keyForRef(ref)
      if (memoryMap.has(key)) {
        throw new Error("Can't overwrite key! Append-only!")
      }
      memoryMap.set(key, block)
    }

  }
}

function createMemoryRatchetStore(): privateNode.RatchetStore {
  const memoryMap = new Map<string, ratchet.SpiralRatchet>()
  const keyForName = (bareName: bloom.BloomFilter) => uint8arrays.toString(bareName, "base64url")

  return {

    getOldestKnownRatchet(bareName) {
      throw "todo"
      // return memoryMap.get(keyForName(bareName))
    }

  }
}

describe("the private node module", () => {

  it("", async () => {
    const store = createMemoryPrivateStore()
    const ratchetStore = createMemoryRatchetStore()
    const ctx = { ...store, ...ratchetStore, now: 0 }

    const path: [string, ...string[]] = ["Apps", "Flatmate", "state.json"]
    const content = new TextEncoder().encode(JSON.stringify({
      hello: "World!"
    }))

    let directory = await privateNode.newDirectory(namefilter.empty(), ctx)
    const emptyFsRef = await privateNode.storeNode(directory, ctx)
    directory = await privateNode.loadNode(emptyFsRef, ctx) as privateNode.PrivateDirectoryPersisted

    directory = await privateNode.write(path, content, directory, ctx)

    const ref = await privateNode.storeNodeAndAdvance(directory, ctx)
    const reconstructed = await privateNode.loadNode(ref, ctx) as privateNode.PrivateDirectory

    const contentRead = await privateNode.read(path, reconstructed, ctx)
    expect(contentRead).toEqual(content)
  })
})
