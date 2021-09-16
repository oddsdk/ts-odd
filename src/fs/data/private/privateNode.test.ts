import expect from "expect"
import all from "it-all"
import * as fc from "fast-check"
import * as uint8arrays from "uint8arrays"

import * as privateNode from "./privateNode.js"
import * as privateStore from "./privateStore.js"
import * as namefilter from "./namefilter.js"
import * as ratchet from "./spiralratchet.js"
import * as bloom from "./bloomfilter.js"
import { ipfsFromContext } from "../../../../tests/mocha-hook.js"


function createMemoryRatchetStore(): privateNode.RatchetStore & { storeRatchet(bareName: bloom.BloomFilter, spiral: ratchet.SpiralRatchet): void } {
  const memoryMap = new Map<string, ratchet.SpiralRatchet>()
  const keyForName = (bareName: bloom.BloomFilter) => uint8arrays.toString(bareName, "base64url")

  return {

    storeRatchet(bareName, spiral) {
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
    const store = privateStore.createInMemory(privateStore.empty())
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
    ratchetStore.storeRatchet(directory.bareName, directory.revision)
    const emptyFsRef = await privateNode.storeNode(directory, ctx)
    directory = await privateNode.loadNode(emptyFsRef, ctx) as privateNode.PrivateDirectoryPersisted

    directory = await privateNode.write(path, content, directory, ctx)

    let reconstructed = await privateNode.loadNode(await privateNode.storeNodeAndAdvance(directory, ctx), ctx) as privateNode.PrivateDirectory

    reconstructed = await privateNode.write(path, content, reconstructed, ctx)
    reconstructed = await privateNode.loadNode(await privateNode.storeNodeAndAdvance(reconstructed, ctx), ctx) as privateNode.PrivateDirectory

    const contentRead = await privateNode.read(path, reconstructed, ctx)
    expect(contentRead).toEqual(content)
  })

  it("round-trips to/from IPFS", async function() {
    const ipfs = ipfsFromContext(this)
    const store = privateStore.create(ipfs)
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
    ratchetStore.storeRatchet(directory.bareName, directory.revision)
    const emptyFsRef = await privateNode.storeNode(directory, ctx)
    directory = await privateNode.loadNode(emptyFsRef, ctx) as privateNode.PrivateDirectoryPersisted

    directory = await privateNode.write(path, content, directory, ctx)

    const ref = await privateNode.storeNodeAndAdvance(directory, ctx)
    
    const iamap = await store.getBackingIAMap()
    console.log(iamap)
    console.log(privateNode.nodeFromCbor(await iamap.get(ref.namefilter)))
  })

})





/*
TODO

* Integrate into HAMT. Implement encryption
  - Take a HAMT, add memory private store on top, do operations, collapse memory private store into HAMT
    - A function overlayPrivateStore(source: PrivateStore): PrivateStore
    - A function collapsePrivateStore(source: PrivateStore, destination: PrivateStore): Promise<void>
    - or maybe something like that
  - Abstract the pair of in-memory PrivateDirectory & PrivateStore
    - Functions for read, write, mkdir, exists, historyFor, etc.
    - Functions that possibly yield an updated HAMT CID?
    - Or functions to apply changes to another PrivateStore?
* Figure out what the sync manager thing is going to be.
  - It spans across the private & public filesystem.

*/
