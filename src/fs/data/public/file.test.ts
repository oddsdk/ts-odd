import expect from "expect"
import { CID } from "ipfs-core"

import { loadCAR } from "../../../../tests/helpers/loadCAR.js"
import { ipfsFromContext } from "../../../../tests/mocha-hook.js"
import { canonicalize } from "../links.test.js"

import * as publicFile from "./file.js"


describe("the data public file module", () => {

  it("round trips from/to IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const fileHeaderCID = new CID("bafybeiaezxgxy2i2cq2phszwj3zspn5yrrbg2rvbqzs7y63i4cjlnpoxlq")

    const car = await loadCAR("tests/fixtures/webnative-integration-test.car", ipfs)
    const [root] = car.roots

    if (root == null) {
      expect(root).toBeDefined()
      return
    }

    const fileHeader = await publicFile.fromCID(fileHeaderCID, { ipfs })
    const decodedCID = await publicFile.toCID(fileHeader, { ipfs })
    expect(decodedCID.toString()).toEqual(fileHeaderCID.toString())
  })

  it("round trips to/from IPFS", async function () {
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
        name: "previous",
        size: 206,
        cid: new CID("bafybeid7uclpcql4aj7rx4lo32gjqbghyrvyvqfjvwwlgky7jdpi32xjra"),
      },
      userland: {
        name: "userland",
        size: 5,
        cid: new CID("bafkreiayl6g3gitr7ys7kyng7sjywlrgimdoymco3jiyab6rozecmoazne"),
      },
    }

    const cid = await publicFile.toCID(fileHeader, { ipfs })
    const decoded = await publicFile.fromCID(cid, { ipfs })
    expect(canonicalize(decoded)).toEqual(canonicalize(fileHeader))
  })

})
