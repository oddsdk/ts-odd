import type { IPFS } from "ipfs-core"

import expect from "expect"
import * as fc from "fast-check"
import CID from "cids"

import { loadCAR } from "../../../../tests/helpers/loadCAR.js"
import { arbitraryFileSystemUsage, FileSystemOperation, FileSystemModel, initialFileSystemModel, runOperation, runOperationsHistory } from "../../../../tests/helpers/fileSystemModel.js"
import { ipfsFromContext } from "../../../../tests/mocha-hook.js"
import { canonicalize } from "../links.test.js"
import { lazyRefFromCID, OperationContext } from "../ref.js"
import * as metadata from "../metadata.js"

import { baseHistoryOn, directoryFromCID, directoryToCID, enumerateHistory, fileFromCID, fileToCID, isPublicFile, mkdir, mv, nodeFromCID, nodeToCID, PublicDirectory, rm, Timestamp, write } from "./publicNode.js"


describe("the data public node module", () => {

  before(async function () {
    fc.configureGlobal(process.env.TEST_ENV === "gh-action" ? { numRuns: 50 } : { numRuns: 10 })
  })

  after(async () => {
    fc.resetConfigureGlobal()
  })


  it("round trips files from/to IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const fileHeaderCID = new CID("bafybeiaezxgxy2i2cq2phszwj3zspn5yrrbg2rvbqzs7y63i4cjlnpoxlq")

    const car = await loadCAR("tests/fixtures/webnative-integration-test.car", ipfs)
    const [root] = car.roots

    if (root == null) {
      expect(root).toBeDefined()
      return
    }

    const fileHeader = await fileFromCID(fileHeaderCID, { ipfs })
    const decodedCID = await fileToCID(fileHeader, { ipfs })
    expect(decodedCID.toString()).toEqual(fileHeaderCID.toString())
  })

  it("round trips files to/from IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const fileHeader = {
      metadata: metadata.updateMtime(metadata.newFile(1621259349710), 1627992355220),
      previous: lazyRefFromCID(await fileToCID({
        metadata: metadata.updateMtime(metadata.newFile(1621259349710), 1627992355220),
        userland: new CID("bafkqaaa")
      }, { ipfs }), fileFromCID),
      userland: new CID("bafkqaaa"),
    }

    const cid = await fileToCID(fileHeader, { ipfs })
    const decoded = await fileFromCID(cid, { ipfs })
    expect(canonicalize(decoded)).toEqual(canonicalize(fileHeader))
  })

  it("round trips directories from/to IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const directoryCID = new CID("bafybeiacqgd7tous6mbq3dony547vb3p2jzq36feiu7jut636jt7tiiy7i")

    const car = await loadCAR("tests/fixtures/webnative-integration-test.car", ipfs)
    const [root] = car.roots

    if (root == null) {
      expect(root).toBeDefined()
      return
    }

    const directory = await directoryFromCID(directoryCID, { ipfs })
    const decodedCID = await directoryToCID(directory, { ipfs })
    expect(decodedCID.toString()).toEqual(directoryCID.toString())
  })

  it("round trips directories to/from IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const directory = {
      metadata: metadata.updateMtime(metadata.newDirectory(1621508308152), 1621887292742),
      previous: lazyRefFromCID(await directoryToCID({
        metadata: metadata.newDirectory(1621508308152),
        userland: {}
      }, { ipfs }), directoryFromCID),
      skeleton: new CID("bafkqaaa"),
      userland: {
        "Apps": lazyRefFromCID(await nodeToCID({
          metadata: metadata.newDirectory(1621887292742),
          userland: {}
        }, { ipfs }), nodeFromCID),
        "index.html": lazyRefFromCID(await nodeToCID({
          metadata: metadata.newFile(1621887292742),
          userland: new CID("bafkqaaa"),
        }, { ipfs }), nodeFromCID),
      }
    }

    const cid = await directoryToCID(directory, { ipfs })
    const decoded = await directoryFromCID(cid, { ipfs })
    expect(canonicalize(decoded)).toEqual(canonicalize(directory))
  })

  it("loads an existing filesystems fixture", async function () {
    const ipfs = ipfsFromContext(this)

    const car = await loadCAR("tests/fixtures/webnative-integration-test.car", ipfs)
    const [root] = car.roots

    if (root == null) {
      expect(root).toBeDefined()
      return
    }

    // /ipfs/<root>/public resolves to this
    const publicRootCID = new CID("bafybeiacqgd7tous6mbq3dony547vb3p2jzq36feiu7jut636jt7tiiy7i")

    const rootDirectory = await directoryFromCID(publicRootCID, { ipfs })
    const files = await listFiles(rootDirectory, ipfs)
    expect(files).toEqual([
      ["Apps", "Fission", "Lobby", "Session"],
      ["index.html"],
    ])
  })

  it("creates histories as modeled", async function () {
    const ipfs = ipfsFromContext(this)

    await fc.assert(
      fc.asyncProperty(
        arbitraryFileSystemUsage({ numOperations: 10 }),
        async ({ ops }) => {
          let fs: PublicDirectory = {
            metadata: metadata.newDirectory(0),
            userland: {}
          }

          // run modeled operations on the 'real' system
          let i = 1
          for (const operation of ops) {
            // add a history step for each operation
            fs = await baseHistoryOn(
              await interpretOperation(fs, operation, { ipfs, now: i }),
              fs,
              { ipfs }
            )
            i++
          }

          await verifyDirectoryHistory(fs, ops, { ipfs })
        }
      )
    )
  })

  it("adds and removes files as modeled", async function () {
    const ipfs = ipfsFromContext(this)

    await fc.assert(
      fc.asyncProperty(
        arbitraryFileSystemUsage({ numOperations: 10 }),
        async ({ state: state, ops }) => {
          let fs: PublicDirectory = {
            metadata: metadata.newDirectory(0),
            userland: {}
          }

          // run modeled operations on the 'real' system
          let i = 1
          for (const operation of ops) {
            fs = await interpretOperation(fs, operation, { ipfs, now: i })
            i++
          }

          // expect all files to be in the modeled state
          const result = await directoryToModel(fs, { ipfs })
          expect(result).toEqual(state)
        }
      )
    )
  })

})

/*

TODOs

* move some path stuff from fileSystemModel.ts into the path module/create a v2 path module?
* implement reconciliation
* test it in different cases (diverging, fast-forward)
* test mmpt
* start private fs implementation

*/

async function verifyDirectoryHistory(directory: PublicDirectory, operations: FileSystemOperation[], ctx: OperationContext): Promise<void> {
  const history = await enumerateHistory(directory, ctx)
  const historyModeled = runOperationsHistory(operations).reverse() // modeled is past to present, actual is present to past

  const actualHistory: FileSystemModel[] = []
  for (const historyEntry of history) {
    actualHistory.push(await directoryToModel(historyEntry, ctx))
  }

  expect(actualHistory).toEqual(historyModeled)
}

async function directoryToModel(
  directory: PublicDirectory,
  ctx: OperationContext,
  atPath: string[] = [],
  model: FileSystemModel = initialFileSystemModel()
): Promise<FileSystemModel> {
  for (const [name, entryRef] of Object.entries(directory.userland)) {
    const entry = await entryRef.get(ctx)
    const path = [...atPath, name] as unknown as [string, ...string[]]
    if (isPublicFile(entry)) {
      const block = await ctx.ipfs.block.get(entry.userland)
      const content = new TextDecoder().decode(block.data)
      model = runOperation(model, { op: "write", path, content })
    } else {
      model = runOperation(model, { op: "mkdir", path })
      model = await directoryToModel(entry, ctx, path, model)
    }
  }
  return model
}

async function interpretOperation(directory: PublicDirectory, operation: FileSystemOperation, ctx: OperationContext & Timestamp): Promise<PublicDirectory> {
  if (operation.op === "write") {
    const block = await ctx.ipfs.block.put(new TextEncoder().encode(operation.content), { format: "raw", version: 1 })
    return await write(operation.path, block.cid, directory, ctx)
  } else if (operation.op === "mkdir") {
    return await mkdir(operation.path, directory, ctx)
  } else if (operation.op === "remove") {
    return await rm(operation.path, directory, ctx)
  } else { // move
    return await mv(operation.from, operation.to, directory, ctx)
  }
}

async function listFiles(directory: PublicDirectory, ipfs: IPFS, pathSoFar: string[] = []): Promise<string[][]> {
  let filePaths: string[][] = []
  for (const [name, entry] of Object.entries(directory.userland)) {
    const path = [...pathSoFar, name]
    const fileOrDirectory = await entry.get({ ipfs })
    if (isPublicFile(fileOrDirectory)) {
      filePaths.push(path)
    } else {
      const additionalPaths = await listFiles(fileOrDirectory, ipfs, path)
      filePaths = [...filePaths, ...additionalPaths]
    }
  }
  return filePaths
}
