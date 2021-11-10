import expect from "expect"
import * as fc from "fast-check"
import * as uint8arrays from "uint8arrays"

import * as privateNode from "./privateNode.js"
import * as privateStore from "./privateStore.js"
import * as namefilter from "./namefilter.js"
import * as ratchet from "./spiralratchet.js"
import * as bloom from "./bloomfilter.js"
import { ipfsFromContext } from "../../../../tests/mocha-hook.js"
import { arbitraryFileSystemUsage, FileSystemModel, FileSystemOperation, initialFileSystemModel, runOperation } from "../../../../tests/helpers/fileSystemModel.js"
import { Timestamp } from "../common.js"


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
    const store = privateStore.createInMemoryUnencrypted(privateStore.empty())
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
  })

  it.only("runs filesystem operations as modeled", async function () {
    const store = privateStore.createInMemoryUnencrypted(privateStore.empty())
    const ratchetStore = createMemoryRatchetStore()
    const ctx = {
      ...store,
      ...ratchetStore,
      now: 0,
      ratchetDisparityBudget: () => 1_000_000
    }

    // @ts-ignore
    let fs: privateNode.PrivateDirectory
    // @ts-ignore
    let fsOps: FileSystemOperation[]

    await fc.assert(
      fc.asyncProperty(
        arbitraryFileSystemUsage({ numOperations: 10 }),
        async ({ state: state, ops }) => {
          fsOps = ops

          fs = await privateNode.newDirectory(namefilter.empty(), ctx)

          // run modeled operations on the 'real' system
          let i = 1
          for (const operation of ops) {
            fs = await interpretOperation(fs, operation, { ...ctx, now: i })
            const ref = await privateNode.storeNodeAndAdvance(fs, ctx)
            fs = await privateNode.loadNode(ref, ctx) as any
            i++
          }

          // expect all files to be in the modeled state
          const result = await directoryToModel(fs, ctx)
          expect(result).toEqual(state)
        }
      ), { numRuns: 1 }
    )

    const namefilters = Array.from(store.getMap().keys()).map(namefilterStr => uint8arrays.fromString(namefilterStr, "base64url"))
    const binaryAnd = (a: Uint8Array, b: Uint8Array) => {
      const l = Math.min(a.length, b.length)
      const result = new Uint8Array(l)
      for (let i = 0; i < l; i++) {
        result[i] = a[i] & b[i]
      }
      return result
    }
    const encoding = "hex"
    const reducedNamefilter = namefilters.reduce(binaryAnd)
    const reducedNamefilterEncoded = uint8arrays.toString(reducedNamefilter, encoding)
    // @ts-ignore
    const bareNameEncoded = uint8arrays.toString(fs.bareName, encoding)

    console.log("ran these filesystem operations:")
    // @ts-ignore
    fsOps.forEach(op => console.log(` - ${JSON.stringify(op)}`))
    console.log("resulting namefilters:")
    namefilters.forEach(filter => console.log(` - ${uint8arrays.toString(filter, encoding)}`))
    console.log("binary and of all above:\n", reducedNamefilterEncoded)
    console.log("bare namefilter of root directory:\n", bareNameEncoded)
    console.log("Are they the same?", bareNameEncoded === reducedNamefilterEncoded)
    
  })

  it("runs filesystem operations as modeled on ipfs", async function () {
    const ipfs = ipfsFromContext(this)
    const store = privateStore.create(ipfs)
    const ratchetStore = createMemoryRatchetStore()
    const ctx = {
      ...store,
      ...ratchetStore,
      now: 0,
      ratchetDisparityBudget: () => 1_000_000
    }

    await fc.assert(
      fc.asyncProperty(
        arbitraryFileSystemUsage({ numOperations: 10 }),
        async ({ state: state, ops }) => {
          let fs = await privateNode.newDirectory(namefilter.empty(), ctx)
          ratchetStore.storeRatchet(fs.bareName, fs.revision)

          // run modeled operations on the 'real' system
          let i = 1
          for (const operation of ops) {
            fs = await interpretOperation(fs, operation, { ...ctx, now: i })
            const ref = await privateNode.storeNodeAndAdvance(fs, ctx)
            fs = await privateNode.loadNode(ref, ctx) as any
            i++
          }

          // expect all files to be in the modeled state
          const result = await directoryToModel(fs, ctx)
          expect(result).toEqual(state)
        }
      ), { numRuns: 10 }
    )
  })

})

async function directoryToModel(
  directory: privateNode.PrivateDirectory,
  ctx: privateNode.PrivateOperationContext,
  atPath: string[] = [],
  model: FileSystemModel = initialFileSystemModel()
): Promise<FileSystemModel> {
  for (const name of Object.keys(directory.links)) {
    const entry = await privateNode.lookupNodeSeeking(name, directory, ctx)
    if (entry == null) {
      throw new Error("This shouldn't happen")
    }
    const path = [...atPath, name] as unknown as [string, ...string[]]
    if (privateNode.isPrivateFile(entry)) {
      const content = new TextDecoder().decode(entry.content)
      model = runOperation(model, { op: "write", path, content })
    } else {
      model = runOperation(model, { op: "mkdir", path })
      model = await directoryToModel(entry, ctx, path, model)
    }
  }
  return model
}

async function interpretOperation(
  directory: privateNode.PrivateDirectory,
  operation: FileSystemOperation,
  ctx: privateNode.PrivateOperationContext & Timestamp
): Promise<privateNode.PrivateDirectory> {
  if (operation.op === "write") {
    const bytes = new TextEncoder().encode(operation.content)
    return await privateNode.write(operation.path, bytes, directory, ctx)
  } else if (operation.op === "mkdir") {
    return await privateNode.mkdir(operation.path, directory, ctx)
  } else if (operation.op === "remove") {
    return await privateNode.rm(operation.path, directory, ctx)
  } else { // move
    return await privateNode.mv(operation.from, operation.to, directory, ctx)
  }
}

