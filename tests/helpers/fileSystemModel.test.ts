import expect from "expect"
import * as fc from "fast-check"
import { arbitraryFileSystemUsage, arbitraryPathSegment, asOperationOnSubdirectory, asSubdirectoryModel, FileSystemOperation, initialFileSystemModel, runOperation, runOperations } from "./fileSystemModel.js"


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
        }).filter(({ usage, subdirectory }) =>
          null == usage.ops.find(op =>
            // can't check this case. It's a hard edge-case
            // Let say 'subdirectory' is "b"
            // then a remove of path "b" would remove everything
            // but also the remove would be filtered, because it's path is not seen
            // as 'acting' on files in the subdirectory.
            // The cleaner option would be to make it actually do that, but then
            // we'd need a representation for remove on ... the root?
            op.op === "remove" && op.path.length === 1 && op.path[0] === subdirectory
          )
        ),
        ({ usage, subdirectory }) => {
          const filteredOps: FileSystemOperation[] = []
          for (const op of usage.ops) {
            const subdirectoryOp = asOperationOnSubdirectory(op, subdirectory)
            if (subdirectoryOp != null) {
              filteredOps.push(subdirectoryOp)
            }
          }
          const subdirectoryModel = asSubdirectoryModel(usage.state, subdirectory)
          const subdirectoryModeled = runOperations(initialFileSystemModel(), filteredOps)
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
