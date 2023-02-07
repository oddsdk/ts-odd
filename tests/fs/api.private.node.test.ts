import * as fc from "fast-check"
import expect from "expect"

import * as Check from "../../src/fs/types/check.js"
import * as Path from "../../src/path/index.js"
import PrivateFile from "../../src/fs/v1/PrivateFile.js"
import PrivateTree from "../../src/fs/v1/PrivateTree.js"

import { emptyFilesystem } from "../helpers/filesystem.js"
import { pathSegment, pathSegmentPair } from "../helpers/paths.js"
import { fileContent } from "../helpers/fileContent.js"


describe("the private filesystem api", function () {

  before(async function () {
    fc.configureGlobal(process.env.TEST_ENV === "gh-action" ? { numRuns: 25 } : { numRuns: 10 })
  })

  after(async () => {
    fc.resetConfigureGlobal()
  })


  it("writes files", async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = Path.file("private", pathSegment)

          await fs.write(filepath, fileContent.val)

          expect(await fs.exists(filepath)).toEqual(true)
        })
    )
  })

  it("removes what it writes", async () => {
    const fs = await emptyFilesystem()
    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = Path.file("private", pathSegment)

          await fs.write(filepath, fileContent.val)
          await fs.rm(filepath)

          expect(await fs.exists(filepath)).toEqual(false)
        })
    )
  })

  it("reads files it writes", async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = Path.file("private", pathSegment)

          await fs.write(filepath, fileContent.val)
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
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair, fileContent }) => {
          const fromPath = Path.file("private", pathSegmentPair.first)
          const toPath = Path.file("private", pathSegmentPair.second)

          await fs.write(fromPath, fileContent.val)
          await fs.mv(fromPath, toPath)
          const fromExists = await fs.exists(fromPath)
          const toExists = await fs.exists(toPath)

          expect(toExists && !fromExists).toEqual(true)
        })
    )
  })

  it("reads moved files", async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair, fileContent }) => {
          const fromPath = Path.file("private", pathSegmentPair.first)
          const toPath = Path.file("private", pathSegmentPair.second)

          await fs.write(fromPath, fileContent.val)
          await fs.mv(fromPath, toPath)

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
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        pathSegment(), async pathSegment => {
          const dirpath = Path.directory("private", pathSegment)

          await fs.mkdir(dirpath)

          expect(await fs.exists(dirpath)).toEqual(true)
        })
    )
  })

  it("removes directories it makes", async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        pathSegment(), async pathSegment => {
          const dirpath = Path.directory("private", pathSegment)

          await fs.mkdir(dirpath)
          await fs.rm(dirpath)

          expect(await fs.exists(dirpath)).toEqual(false)
        })
    )
  })

  it("writes files to a directory", async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = Path.file("private", pathSegment)

          await fs.write(filepath, fileContent.val)

          expect(await fs.exists(filepath)).toEqual(true)
        })
    )
  })

  it("lists files written to a directory", async () => {
    const fs = await emptyFilesystem()
    const dirpath = Path.directory("private", "testDir")
    await fs.mkdir(dirpath)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = Path.file("private", "testDir", pathSegment)

          await fs.write(filepath, fileContent.val)
          const listing = await fs.ls(dirpath)

          expect(pathSegment in listing).toEqual(true)
        })
    )
  })

  it("moves files into a directory", async () => {
    const fs = await emptyFilesystem()
    const dirpath = Path.directory("private", "testDir")
    await fs.mkdir(dirpath)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair, fileContent }) => {
          const fromPath = Path.file("private", pathSegmentPair.first)
          const toPath = Path.file("private", pathSegmentPair.second)

          await fs.write(fromPath, fileContent.val)
          await fs.mv(fromPath, toPath)
          const fromExists = await fs.exists(fromPath)
          const toExists = await fs.exists(toPath)

          expect(toExists && !fromExists).toEqual(true)
        })
    )
  })

  it("makes soft links to directories", async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair }) => {
          const atPath = Path.directory("private", pathSegmentPair.first)
          const referringToPath = Path.directory("private", pathSegmentPair.second)
          const name = Path.terminus(referringToPath) || "Symlink"

          await fs.mkdir(referringToPath)
          await fs.symlink({
            at: atPath,
            referringTo: { path: referringToPath },
            name
          })

          const at = await fs.get(atPath) as PrivateTree
          const symlink = Check.isFile(at) || at === null ? null : at.getLinks()[ name ]
          const followed = await fs.get(referringToPath)

          expect(!!symlink).toEqual(true)
          expect(Check.isSoftLink(symlink)).toEqual(true)
          expect(followed).toBeInstanceOf(PrivateTree)
        })
    )
  })

  it("makes soft links to files", async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair }) => {
          const atPath = Path.directory("private", pathSegmentPair.first)
          const referringToPath = Path.file("private", pathSegmentPair.second)
          const name = Path.terminus(referringToPath) || "Symlink"

          await fs.write(referringToPath, new Uint8Array())
          await fs.symlink({
            at: atPath,
            referringTo: { path: referringToPath },
            name,
          })

          const at = await fs.get(atPath) as PrivateTree
          const symlink = Check.isFile(at) || at === null ? null : at.getLinks()[ name ]
          const followed = await fs.get(referringToPath)

          expect(!!symlink).toEqual(true)
          expect(Check.isSoftLink(symlink)).toEqual(true)
          expect(followed).toBeInstanceOf(PrivateFile)
        })
    )
  })
})
