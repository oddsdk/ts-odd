import expect from "expect"
import * as fc from "fast-check"
import { initialFileSystemModel, runOperation } from "./fileSystemModel.js"


describe("the file system model", () => {

  before(async function () {
    fc.configureGlobal({ numRuns: 1000 })
  })

  after(async () => {
    fc.resetConfigureGlobal()
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

  it("copies files", () => {
    expect(runOperation({
      files: new Map([["a/b/c", "abc"]]),
      directories: new Set(["a", "a/b"])
    }, {
      op: "copy",
      from: ["a", "b", "c"],
      to: ["x", "y"]
    })).toEqual({
      file: new Map([["a/b/c", "abc"], ["x/y", "abc"]]),
      directories: new Set(["a", "a/b", "x"])
    })
  })

})
