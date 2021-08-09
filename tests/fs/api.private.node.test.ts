import expect from "expect"
import * as fc from "fast-check"

import "../../src/setup/node.js"
import * as path from "../../src/path.js"

import { pathSegment, pathSegmentPair } from "../helpers/paths.js"
import { emptyFilesystem } from "../helpers/filesystem.js"
import { privateFileContent as fileContent, privateDecode as decode } from "../helpers/fileContent.js"


describe("the private filesystem api", function () {

  before(async function () {
    fc.configureGlobal(process.env.TEST_ENV === "gh-action" ? { numRuns: 50 } : { numRuns: 10 })
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
          const filepath = path.file("private", pathSegment)

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
          const filepath = path.file("private", pathSegment)

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
          const filepath = path.file("private", pathSegment)

          await fs.write(filepath, fileContent.val)
          const file = await fs.read(filepath)
          if (file == null) {
            expect(file).not.toBe(null)
            return
          }
          const content = decode(file, fileContent.type)

          expect(content).toEqual(fileContent.val)
        })
    )
  })

  it("moves files", async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair, fileContent }) => {
          const fromPath = path.file("private", pathSegmentPair.first)
          const toPath = path.file("private", pathSegmentPair.second)

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
          const fromPath = path.file("private", pathSegmentPair.first)
          const toPath = path.file("private", pathSegmentPair.second)

          await fs.write(fromPath, fileContent.val)
          await fs.mv(fromPath, toPath)

          const file = await fs.read(toPath)
          if (file == null) {
            expect(file).not.toBe(null)
            return
          }
          const content = decode(file, fileContent.type)

          expect(content).toEqual(fileContent.val)
        })
    )
  })

  it("makes directories", async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        pathSegment(), async pathSegment => {
          const dirpath = path.directory("private", pathSegment)

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
          const dirpath = path.directory("private", pathSegment)

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
          const filepath = path.file("private", pathSegment)

          await fs.write(filepath, fileContent.val)

          expect(await fs.exists(filepath)).toEqual(true)
        })
    )
  })

  it("lists files written to a directory", async () => {
    const fs = await emptyFilesystem()
    const dirpath = path.directory("private", "testDir")
    await fs.mkdir(dirpath)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = path.file("private", "testDir", pathSegment)

          await fs.write(filepath, fileContent.val)
          const listing = await fs.ls(dirpath)

          expect(pathSegment in listing).toEqual(true)
        })
    )
  })

  it("moves files into a directory", async () => {
    const fs = await emptyFilesystem()
    const dirpath = path.directory("private", "testDir")
    await fs.mkdir(dirpath)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair, fileContent }) => {
          const fromPath = path.file("private", pathSegmentPair.first)
          const toPath = path.file("private", pathSegmentPair.second)

          await fs.write(fromPath, fileContent.val)
          await fs.mv(fromPath, toPath)
          const fromExists = await fs.exists(fromPath)
          const toExists = await fs.exists(toPath)

          expect(toExists && !fromExists).toEqual(true)
        })
    )
  })
})