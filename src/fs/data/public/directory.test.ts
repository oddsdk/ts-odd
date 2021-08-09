import expect from "expect"
import { CID } from "ipfs-core"

import { loadCAR } from "../../../../tests/helpers/loadCAR.js"
import { ipfsFromContext } from "../../../../tests/mocha-hook.js"
import { canonicalize } from "../links.test.js"

import * as publicDirectory from "./directory.js"


describe("the data public directory module", () => {

  it("round trips from/to IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const directoryCID = new CID("bafybeiacqgd7tous6mbq3dony547vb3p2jzq36feiu7jut636jt7tiiy7i")

    const car = await loadCAR("tests/fixtures/webnative-integration-test.car", ipfs)
    const [root] = car.roots

    if (root == null) {
      expect(root).toBeDefined()
      return
    }

    const directory = await publicDirectory.fromCID(directoryCID, { ipfs })
    const decodedCID = await publicDirectory.toCID(directory, { ipfs })
    expect(decodedCID.toString()).toEqual(directoryCID.toString())
  })

  it("round trips to/from IPFS", async function () {
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
        name: "previous",
        size: 27960,
        cid: new CID("bafybeib4hqxwnfdh453qwvvog6fzdrph36zad5dvexcphj7yjb6mwktyla"),
      },
      skeleton: {
        name: "skeleton",
        size: 1174,
        cid: new CID("bafkreie2w6qrq2xia4nefs4hxw2qpjgbzhdo6uwgngj5lgbou77tev5omq"),
      },
      userland: {
        size: 12710,
        data: {
          "Apps": {
            name: "Apps",
            size: 12043,
            cid: new CID("bafybeiflfmrx2crvdl2su4zrrj5ps7yudmmamokxfk5l35fwajyqsbhjpq"),
          },
          "index.html": {
            name: "index.html",
            size: 559,
            cid: new CID("bafybeiaezxgxy2i2cq2phszwj3zspn5yrrbg2rvbqzs7y63i4cjlnpoxlq"),
          },
        },
      },
    }

    const cid = await publicDirectory.toCID(directory, { ipfs })
    const decoded = await publicDirectory.fromCID(cid, { ipfs })
    expect(canonicalize(decoded)).toEqual(canonicalize(directory))
  })

})
