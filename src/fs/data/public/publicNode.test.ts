import expect from "expect"
import * as fc from "fast-check"
import { CID, IPFS } from "ipfs-core"

import { loadCAR } from "../../../../tests/helpers/loadCAR.js"
import { ipfsFromContext } from "../../../../tests/mocha-hook.js"
import { canonicalize } from "../links.test.js"
import { lazyRefFromCID } from "../ref.js"
import * as metadata from "../metadata.js"

import { baseHistoryOn, directoryFromCID, directoryToCID, enumerateHistory, exists, fileFromCID, fileToCID, getNode, isPublicFile, mkdir, nodeFromCID, nodeToCID, PublicDirectory, PublicFile, read, rm, write } from "./publicNode.js"
import { arbitraryFileSystemModel, fromPosix } from "../../../../tests/helpers/modelFileSystem.js"


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

  it("loads existing filesystems just fine", async function () {
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

  it("adds directories when write is used", async function () {
    const ipfs = ipfsFromContext(this)

    const emptyDirectory: PublicDirectory = {
      metadata: metadata.newDirectory(1621259349710),
      userland: {}
    }

    expect(await listFiles(emptyDirectory, ipfs)).toEqual([])

    const nonEmptyDir = await baseHistoryOn(await write(
      ["Apps", "matheus23", "Flatmate", "file.txt"],
      new CID("bafkqaaa"),
      emptyDirectory,
      { ipfs, now: 1621259349711 }
    ), emptyDirectory, { ipfs })

    const evenLessEmptyDir = await baseHistoryOn(await write(
      ["Apps", "matheus23", "appinator", "state.json"],
      new CID("bafkqaaa"),
      nonEmptyDir,
      { ipfs, now: 1621259349712 }
    ), nonEmptyDir, { ipfs })

    expect(await listFiles(nonEmptyDir, ipfs)).toEqual([
      ["Apps", "matheus23", "Flatmate", "file.txt"]
    ])
    expect(await listFiles(evenLessEmptyDir, ipfs)).toEqual([
      ["Apps", "matheus23", "Flatmate", "file.txt"],
      ["Apps", "matheus23", "appinator", "state.json"]
    ])
    const emptyDirHistory = await enumerateHistory(emptyDirectory, { ipfs })
    const nonEmptyDirHistory = await enumerateHistory(nonEmptyDir, { ipfs })
    const evenLessEmptyDirHistory = await enumerateHistory(evenLessEmptyDir, { ipfs })
    expect(emptyDirHistory.length).toEqual(1)
    expect(nonEmptyDirHistory.length).toEqual(2)
    expect(evenLessEmptyDirHistory.length).toEqual(3)

    const appsDir = await getNode(["Apps"], evenLessEmptyDir, { ipfs })
    if (appsDir == null) {
      expect(appsDir).not.toBe(null)
      expect(appsDir).toBeDefined()
      return
    }
    const appsDirHistory = await enumerateHistory(appsDir, { ipfs })
    expect(appsDirHistory.length).toEqual(2)
  })

  it("works as modeled", async function () {
    const ipfs = ipfsFromContext(this)

    await fc.assert(
      fc.asyncProperty(
        arbitraryFileSystemModel({ numOperations: 8 }),
        async ({ state, ops }) => {
          let fs: PublicDirectory = {
            metadata: metadata.newDirectory(0),
            userland: {}
          }

          // run modeled operations on the 'real' system
          let i = 1
          for (const operation of ops) {
            if (operation.op === "write") {
              const block = await ipfs.block.put(new TextEncoder().encode(operation.content))
              fs = await write(operation.path, block.cid, fs, { ipfs, now: i })
            } else if (operation.op === "mkdir") {
              fs = await mkdir(operation.path, fs, { ipfs, now: i })
            } else {
              fs = await rm(operation.path, fs, { ipfs, now: i })
            }
            i++
          }

          // expect all files to be in the modeled state
          for (const [path, content] of state.files.entries()) {
            const actualPath = fromPosix(path)
            expect(await exists(actualPath, fs, { ipfs })).toBe(true)
            const cid = await read(actualPath, fs, { ipfs })
            const block = await ipfs.block.get(cid)
            expect(new TextDecoder().decode(block.data)).toEqual(content)
          }
          for (const path of state.directories.values()) {
            expect(await exists(fromPosix(path), fs, { ipfs })).toBe(true)
          }
        }
      )
    )
  })

})

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
