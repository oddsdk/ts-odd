import expect from "expect"
import { CID } from "ipfs-core"

import { loadCAR } from "../../../../tests/helpers/loadCAR.js"
import { ipfsFromContext } from "../../../../tests/mocha-hook.js"
import { canonicalize } from "../links.test.js"
import { lazyRefFromCID } from "../ref.js"

import * as publicNode from "./publicNode.js"


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

    const fileHeader = await publicNode.fileFromCID(fileHeaderCID, { ipfs })
    const decodedCID = await publicNode.fileToCID(fileHeader, { ipfs })
    expect(decodedCID.toString()).toEqual(fileHeaderCID.toString())
  })

  it("round trips files to/from IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const fileHeader = {
      metadata: {
        data: {
          "isFile": true,
          "version": {
            "major": 1,
            "minor": 0,
            "patch": 0
          },
          "unixMeta": {
            "mode": 755,
            "_type": "file",
            "ctime": 1621259349710,
            "mtime": 1627992355220
          }
        },
        size: 98
      },
      previous: {
        size: 206,
        data: lazyRefFromCID(new CID("bafybeid7uclpcql4aj7rx4lo32gjqbghyrvyvqfjvwwlgky7jdpi32xjra"), publicNode.fileFromCID),
      },
      userland: {
        size: 5,
        data: new CID("bafkreiayl6g3gitr7ys7kyng7sjywlrgimdoymco3jiyab6rozecmoazne"),
      },
    }

    const cid = await publicNode.fileToCID(fileHeader, { ipfs })
    const decoded = await publicNode.fileFromCID(cid, { ipfs })
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

    const directory = await publicNode.directoryFromCID(directoryCID, { ipfs })
    const decodedCID = await publicNode.directoryToCID(directory, { ipfs })
    expect(decodedCID.toString()).toEqual(directoryCID.toString())
  })

  it("round trips directories to/from IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const directory = {
      metadata: {
        size: 97,
        data: {
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
      },
      previous: {
        size: 27960,
        data: lazyRefFromCID(new CID("bafybeib4hqxwnfdh453qwvvog6fzdrph36zad5dvexcphj7yjb6mwktyla"), publicNode.directoryFromCID),
      },
      skeleton: {
        size: 1174,
        data: new CID("bafkreie2w6qrq2xia4nefs4hxw2qpjgbzhdo6uwgngj5lgbou77tev5omq"),
      },
      userland: {
        size: 12710,
        data: {
          "Apps": {
            size: 12043,
            data: lazyRefFromCID(new CID("bafybeiflfmrx2crvdl2su4zrrj5ps7yudmmamokxfk5l35fwajyqsbhjpq"), publicNode.nodeFromCID),
          },
          "index.html": {
            size: 559,
            data: lazyRefFromCID(new CID("bafybeiaezxgxy2i2cq2phszwj3zspn5yrrbg2rvbqzs7y63i4cjlnpoxlq"), publicNode.nodeFromCID),
          },
        },
      },
    }

    const cid = await publicNode.directoryToCID(directory, { ipfs })
    const decoded = await publicNode.directoryFromCID(cid, { ipfs })
    expect(canonicalize(decoded)).toEqual(canonicalize(directory))
  })

})
