import expect from "expect"
import { CID, IPFS } from "ipfs-core"

import { loadCAR } from "../../../../tests/helpers/loadCAR.js"
import { ipfsFromContext } from "../../../../tests/mocha-hook.js"
import { canonicalize } from "../links.test.js"
import { lazyRefFromCID } from "../ref.js"
import * as metadata from "../metadata.js"

import { baseHistoryOn, directoryFromCID, directoryToCID, fileFromCID, fileToCID, isPublicFile, nodeFromCID, PublicDirectory, PublicFile, write } from "./publicNode.js"


describe("the data public node module", () => {

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
      metadata: {
        "isFile": true,
        "version": {
          "major": 1,
          "minor": 0,
          "patch": 0
        },
        "unixMeta": {
          "mode": 644,
          "_type": "file",
          "ctime": 1621259349710,
          "mtime": 1627992355220
        }
      },
      previous: lazyRefFromCID(new CID("bafybeid7uclpcql4aj7rx4lo32gjqbghyrvyvqfjvwwlgky7jdpi32xjra"), fileFromCID),
      userland: new CID("bafkreiayl6g3gitr7ys7kyng7sjywlrgimdoymco3jiyab6rozecmoazne"),
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
      metadata: {
        "isFile": false,
        "version": {
          "major": 1,
          "minor": 0,
          "patch": 0
        },
        "unixMeta": {
          "mode": 755,
          "_type": "dir",
          "ctime": 1621508308152,
          "mtime": 1621887292742
        }
      },
      previous: lazyRefFromCID(new CID("bafybeib4hqxwnfdh453qwvvog6fzdrph36zad5dvexcphj7yjb6mwktyla"), directoryFromCID),
      skeleton: new CID("bafkreie2w6qrq2xia4nefs4hxw2qpjgbzhdo6uwgngj5lgbou77tev5omq"),
      userland: {
        "Apps": lazyRefFromCID(new CID("bafybeiflfmrx2crvdl2su4zrrj5ps7yudmmamokxfk5l35fwajyqsbhjpq"), nodeFromCID),
        "index.html": lazyRefFromCID(new CID("bafybeiaezxgxy2i2cq2phszwj3zspn5yrrbg2rvbqzs7y63i4cjlnpoxlq"), nodeFromCID),
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

  it("adds directories when write is used", async function() {
    const ipfs = ipfsFromContext(this)

    const emptyDirectory: PublicDirectory = {
      metadata: metadata.emptyDirectory(1621259349710),
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

    // TODO: Check history
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
