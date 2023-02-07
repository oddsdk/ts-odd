import * as fc from "fast-check"
import expect from "expect"

import * as Check from "../../src/fs/types/check.js"
import * as Path from "../../src/path/index.js"
import * as Versions from "../../src/fs/versions.js"

import PublicFile from "../../src/fs/v1/PublicFile.js"
import PublicTree from "../../src/fs/v1/PublicTree.js"

import { emptyFilesystem } from "../helpers/filesystem.js"
import { pathSegment, pathSegmentPair } from "../helpers/paths.js"
import { fileContent } from "../helpers/fileContent.js"


const wasmVersion = Versions.toString(Versions.wnfsWasm)
const wnfsWasmEnabled = process.env.WNFS_WASM != null
const itSkipInWasm = wnfsWasmEnabled ? it.skip : it

let fsVersion = Versions.toString(Versions.v1)

describe("the public filesystem api", function () {

  before(async function () {
    fc.configureGlobal(process.env.TEST_ENV === "gh-action" ? { numRuns: 25 } : { numRuns: 10 })

    if (wnfsWasmEnabled) {
      fsVersion = wasmVersion
    }
  })

  after(async () => {
    fc.resetConfigureGlobal()
  })


  it("writes files", async () => {
    const fs = await emptyFilesystem(fsVersion)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = Path.file("public", pathSegment)

          await fs.write(filepath, fileContent.val)
          await fs.historyStep()

          expect(await fs.exists(filepath)).toEqual(true)
        })
    )
  })

  it("removes files it writes", async () => {
    const fs = await emptyFilesystem(fsVersion)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = Path.file("public", pathSegment)

          await fs.write(filepath, fileContent.val)
          await fs.historyStep()
          await fs.rm(filepath)
          await fs.historyStep()

          expect(await fs.exists(filepath)).toEqual(false)
        })
    )
  })

  it("reads files it writes", async () => {
    const fs = await emptyFilesystem(fsVersion)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = Path.file("public", pathSegment)

          await fs.write(filepath, fileContent.val)
          await fs.historyStep()
          const file = await fs.read(filepath)
          if (file == null) {
            expect(file).not.toBe(null)
            return
          }
          expect(file).toEqual(fileContent.val)
        })
    )
  })

  it("moves files", async () => {
    const fs = await emptyFilesystem(fsVersion)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair, fileContent }) => {
          const fromPath = Path.file("public", pathSegmentPair.first)
          const toPath = Path.file("public", pathSegmentPair.second)

          await fs.write(fromPath, fileContent.val)
          await fs.historyStep()
          await fs.mv(fromPath, toPath)
          await fs.historyStep()
          const fromExists = await fs.exists(fromPath)
          const toExists = await fs.exists(toPath)

          expect(toExists && !fromExists).toEqual(true)
        })
    )
  })

  it("reads moved files", async () => {
    const fs = await emptyFilesystem(fsVersion)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair, fileContent }) => {
          const fromPath = Path.file("public", pathSegmentPair.first)
          const toPath = Path.file("public", pathSegmentPair.second)

          await fs.write(fromPath, fileContent.val)
          await fs.historyStep()
          await fs.mv(fromPath, toPath)
          await fs.historyStep()

          const file = await fs.read(toPath)
          if (file == null) {
            expect(file).not.toBe(null)
            return
          }

          expect(file).toEqual(fileContent.val)
        })
    )
  })

  it("makes directories", async () => {
    const fs = await emptyFilesystem(fsVersion)

    await fc.assert(
      fc.asyncProperty(
        pathSegment(), async pathSegment => {
          const dirpath = Path.directory("public", pathSegment)

          await fs.mkdir(dirpath)
          await fs.historyStep()

          expect(await fs.exists(dirpath)).toEqual(true)
        }),
      { numRuns: 100 }
    )
  })

  it("removes directories it makes", async () => {
    const fs = await emptyFilesystem(fsVersion)

    await fc.assert(
      fc.asyncProperty(
        pathSegment(), async pathSegment => {
          const dirpath = Path.directory("public", pathSegment)

          await fs.mkdir(dirpath)
          await fs.historyStep()
          await fs.rm(dirpath)
          await fs.historyStep()

          expect(await fs.exists(dirpath)).toEqual(false)
        })
    )
  })

  it("writes files to a directory", async () => {
    const fs = await emptyFilesystem(fsVersion)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = Path.file("public", pathSegment)

          await fs.write(filepath, fileContent.val)
          await fs.historyStep()

          expect(await fs.exists(filepath)).toEqual(true)
        })
    )
  })

  it("lists files written to a directory", async () => {
    const fs = await emptyFilesystem(fsVersion)
    const dirpath = Path.directory("public", "testDir")
    await fs.mkdir(dirpath)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = Path.file("public", "testDir", pathSegment)

          await fs.write(filepath, fileContent.val)
          await fs.historyStep()
          const listing = await fs.ls(dirpath)

          expect(pathSegment in listing).toEqual(true)
        })
    )
  })

  it("moves files into a directory", async () => {
    const fs = await emptyFilesystem(fsVersion)
    const dirpath = Path.directory("public", "testDir")
    await fs.mkdir(dirpath)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair, fileContent }) => {
          const fromPath = Path.file("public", pathSegmentPair.first)
          const toPath = Path.file("public", pathSegmentPair.second)

          await fs.write(fromPath, fileContent.val)
          await fs.historyStep()
          await fs.mv(fromPath, toPath)
          await fs.historyStep()
          const fromExists = await fs.exists(fromPath)
          const toExists = await fs.exists(toPath)

          expect(toExists && !fromExists).toEqual(true)
        })
    )
  })

  itSkipInWasm("makes soft links to directories", async () => {
    const fs = await emptyFilesystem(fsVersion)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair }) => {
          const atPath = Path.directory("public", pathSegmentPair.first)
          const referringToPath = Path.directory("public", pathSegmentPair.second)
          const name = Path.terminus(referringToPath) || "Symlink"

          await fs.mkdir(referringToPath)
          await fs.symlink({
            at: atPath,
            referringTo: { path: referringToPath },
            name
          })

          const at = await fs.get(atPath) as PublicTree
          const symlink = Check.isFile(at) || at === null ? null : at.getLinks()[ name ]
          const followed = await fs.get(referringToPath)

          expect(!!symlink).toEqual(true)
          expect(Check.isSoftLink(symlink)).toEqual(true)
          expect(followed).toBeInstanceOf(PublicTree)
        })
    )
  })

  itSkipInWasm("makes soft links to files", async () => {
    const fs = await emptyFilesystem(fsVersion)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair }) => {
          const atPath = Path.directory("public", pathSegmentPair.first)
          const referringToPath = Path.file("public", pathSegmentPair.second)
          const name = Path.terminus(referringToPath) || "Symlink"

          await fs.write(referringToPath, new Uint8Array())
          await fs.symlink({
            at: atPath,
            referringTo: { path: referringToPath },
            name
          })

          const at = await fs.get(atPath) as PublicTree
          const symlink = Check.isFile(at) || at === null ? null : at.getLinks()[ name ]
          const followed = await fs.get(referringToPath)

          expect(!!symlink).toEqual(true)
          expect(Check.isSoftLink(symlink)).toEqual(true)
          expect(followed).toBeInstanceOf(PublicFile)
        })
    )
  })
})
