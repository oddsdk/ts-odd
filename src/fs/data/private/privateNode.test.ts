import expect from "expect"
import * as fc from "fast-check"
import * as uint8arrays from "uint8arrays"

import * as privateNode from "./privateNode.js"
import * as namefilter from "./namefilter.js"
import * as ratchet from "./spiralratchet.js"
import * as bloom from "./bloomfilter.js"
import all from "it-all"


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

    observedRatchet(bareName, spiral) {
      const key = keyForName(bareName)
      if (!memoryMap.has(key)) {
        memoryMap.set(key, spiral)
      }
    },

    getOldestKnownRatchet(bareName) {
      const spiral = memoryMap.get(keyForName(bareName))
      if (spiral == null) {
        throw new Error(`Couldn't find a ratchet for this name ${bareName}`)
      }
      return spiral
    }

  }
}

describe("the private node module", () => {

  it("loads what it stored after write", async () => {
    const store = createMemoryPrivateStore()
    const ratchetStore = createMemoryRatchetStore()
    const ctx = {
      ...store,
      ...ratchetStore,
      now: 0,
      ratchetDisparityBudget: () => 1_000_000
    }

    const path: [string, ...string[]] = ["Apps", "Flatmate", "state.json"]
    const content = new TextEncoder().encode(JSON.stringify({
      hello: "World!"
    }))

    let directory = await privateNode.newDirectory(namefilter.empty(), ctx)
    ratchetStore.observedRatchet(directory.bareName, directory.revision)
    const emptyFsRef = await privateNode.storeNode(directory, ctx)
    directory = await privateNode.loadNode(emptyFsRef, ctx) as privateNode.PrivateDirectoryPersisted

    directory = await privateNode.write(path, content, directory, ctx)

    let reconstructed = await privateNode.loadNode(await privateNode.storeNodeAndAdvance(directory, ctx), ctx) as privateNode.PrivateDirectory

    console.log(await all(privateNode.historyFor([], reconstructed, ctx)))

    reconstructed = await privateNode.write(path, content, reconstructed, ctx)
    reconstructed = await privateNode.loadNode(await privateNode.storeNodeAndAdvance(reconstructed, ctx), ctx) as privateNode.PrivateDirectory

    console.log(await all(privateNode.historyFor(path, reconstructed, ctx)))

    const contentRead = await privateNode.read(path, reconstructed, ctx)
    expect(contentRead).toEqual(content)
  })

})
