import expect from "expect"
import * as fc from "fast-check"

import { arbitraryFileSystemUsage, FileSystemOperation, FileSystemModel, initialFileSystemModel, runOperation, runOperationsHistory } from "../../../../tests/helpers/fileSystemModel.js"
import * as metadata from "../metadata.js"

import { baseHistoryOn, enumerateHistory, isPublicFile, mkdir, mv, OperationContext, PublicDirectory, resolveLink, rm, write } from "./publicNode.js"
import { Timestamp } from "../common.js"
import { createMemoryBlockStore } from "../blockStore.js"


describe("the data public node module", () => {

  it("creates histories as modeled", async function () {
    const ctx = createMemoryBlockStore()

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
              await interpretOperation(fs, operation, { ...ctx, now: i }),
              fs,
              ctx
            )
            i++
          }

          await verifyDirectoryHistory(fs, ops, ctx)
        }
      )
    )
  })

  it("runs filesystem operations as modeled", async function () {
    const ctx = createMemoryBlockStore()

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
            fs = await interpretOperation(fs, operation, { ...ctx, now: i })
            i++
          }

          // expect all files to be in the modeled state
          const result = await directoryToModel(fs, ctx)
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
    const entry = await resolveLink(entryRef, ctx)
    const path = [...atPath, name] as unknown as [string, ...string[]]
    if (isPublicFile(entry)) {
      const block = await ctx.getBlock(entry.userland, ctx)
      const content = new TextDecoder().decode(block)
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
    const cid = await ctx.putBlock(new TextEncoder().encode(operation.content), { code: 0x55, name: "raw" }, { signal: ctx.signal })
    return await write(operation.path, cid, directory, ctx)
  } else if (operation.op === "mkdir") {
    return await mkdir(operation.path, directory, ctx)
  } else if (operation.op === "remove") {
    return await rm(operation.path, directory, ctx)
  } else { // move
    return await mv(operation.from, operation.to, directory, ctx)
  }
}

// async function listFiles(directory: PublicDirectory, ctx: OperationContext, pathSoFar: string[] = []): Promise<string[][]> {
//   let filePaths: string[][] = []
//   for (const [name, entry] of Object.entries(directory.userland)) {
//     const path = [...pathSoFar, name]
//     const fileOrDirectory = await resolveLink(entry, ctx)
//     if (isPublicFile(fileOrDirectory)) {
//       filePaths.push(path)
//     } else {
//       const additionalPaths = await listFiles(fileOrDirectory, ctx, path)
//       filePaths = [...filePaths, ...additionalPaths]
//     }
//   }
//   return filePaths
// }
