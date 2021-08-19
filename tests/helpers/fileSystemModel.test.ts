import expect from "expect"
import * as fc from "fast-check"
import { arbitraryFileSystemUsage, arbitraryPathSegment, asOperationOnSubdirectory, asSubdirectoryModel, FileSystemOperation, historyForSubdirectory, initialFileSystemModel, removesSubdirectory, runOperation, runOperations } from "./fileSystemModel.js"


describe("the file system model", () => {

  before(async function () {
    fc.configureGlobal({ numRuns: 1000 })
  })

  after(async () => {
    fc.resetConfigureGlobal()
  })


  it("has consistent semantics when filtering down to subdirectories", () => {
    fc.assert(
      fc.property(
        fc.record({
          usage : arbitraryFileSystemUsage({ numOperations: 10 }),
          subdirectory : arbitraryPathSegment(),
        }),
        ({ usage, subdirectory }) => {
          const subdirectoryModel = asSubdirectoryModel(usage.state, subdirectory)
          const subdirectoryModeled = runOperations(initialFileSystemModel(), historyForSubdirectory(usage.ops, subdirectory))
          expect(subdirectoryModeled).toEqual(subdirectoryModel)
        }
      )
    )
  })

  it("creates files and directories for write", () => {
    expect(runOperation(initialFileSystemModel(), {
      op: "write",
      path: ["a", "b", "c"],
      content: "abc"
    })).toEqual({
      files: new Map([["a/b/c", "abc"]]),
      directories: new Set(["a", "a/b"])
    })
  })

  it("creates directories for mkdir", () => {
    expect(runOperation(initialFileSystemModel(), {
      op: "mkdir",
      path: ["a", "b", "c"]
    })).toEqual({
      files: new Map(),
      directories: new Set(["a", "a/b", "a/b/c"])
    })
  })

  it("removes files on remove", () => {
    expect(runOperation({
      files: new Map([["a/b/c", "abc"]]),
      directories: new Set(["a", "a/b"])
    }, {
      op: "remove",
      path: ["a"],
    })).toEqual({
      files: new Map(),
      directories: new Set()
    })
  })

  it("removes files and directories on remove", () => {
    expect(runOperation({
      files: new Map([["a/b/c", "abc"]]),
      directories: new Set(["a", "a/b"])
    }, {
      op: "remove",
      path: ["a"],
    })).toEqual({
      files: new Map(),
      directories: new Set()
    })
  })

})
