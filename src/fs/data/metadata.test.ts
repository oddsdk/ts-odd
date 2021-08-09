import expect from "expect"
import { CID } from "ipfs-core"

import { loadCAR } from "../../../tests/helpers/loadCAR.js"

import * as metadata from "./metadata.js"
import { ipfsFromContext } from "../../../tests/mocha-hook.js"


describe("metadata", () => {

  it("round trips to/from IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const original: metadata.Metadata = {
      "isFile": false,
      "version": {
        "major": 1,
        "minor": 0,
        "patch": 0
      },
      "unixMeta": {
        "mode": 755,
        "_type": "dir",
        "ctime": 1621259349710,
        "mtime": 1627992355220
      }
    }
    const metadataCID = await metadata.persistence.toCID(original, { ipfs })
    const decoded = await metadata.persistence.fromCID(metadataCID, { ipfs })
    expect(decoded).toEqual(original)
  })

  it("successfully reads existing metadata", async function () {
    const ipfs = ipfsFromContext(this)

    const car = await loadCAR("tests/fixtures/webnative-integration-test.car", ipfs)
    const [root] = car.roots

    if (root == null) {
      expect(root).toBeDefined()
      return
    }

    // Fails for some reason??? Works on the command line
    // const metadataPath = `/ipfs/${root.toString()}/public/metadata`
    // const metadataCID = await ipfs.resolve(metadataPath)
    const metadataCID = new CID("bafkreifn7hwfiuvb2kuff4cv4yeqlbnoux7mfyhhu634l7nikrpzegvyhm")
    const decoded = await metadata.persistence.fromCID(metadataCID, { ipfs })
    expect(metadata.isMetadata(decoded)).toBe(true)
  })

})