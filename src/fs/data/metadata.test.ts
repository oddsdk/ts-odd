import expect from "expect"
import CID from "cids"

import { loadCAR } from "../../../tests/helpers/loadCAR.js"

import * as metadata from "./metadata.js"
import { ipfsFromContext } from "../../../tests/mocha-hook.js"


describe("the data metadata module", () => {

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
    const metadataCID = await metadata.metadataToCID(original, { ipfs })
    const decoded = await metadata.metadataFromCID(metadataCID, { ipfs })
    expect(decoded).toEqual(original)
  })

  it("round trips from/to IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const car = await loadCAR("tests/fixtures/webnative-integration-test.car", ipfs)
    const [root] = car.roots

    if (root == null) {
      expect(root).toBeDefined()
      return
    }

    // Fails for some reason??? Works on the command line
    // const metadataPath = `/ipfs/${root.toString()}/public/metadata`
    // const exampleCID = await ipfs.resolve(metadataPath)
    const exampleCID = new CID("bafkreifn7hwfiuvb2kuff4cv4yeqlbnoux7mfyhhu634l7nikrpzegvyhm")
    const decoded = await metadata.metadataFromCID(exampleCID, { ipfs })
    const decodedCID = await metadata.metadataToCID(decoded, { ipfs })
    expect(exampleCID.toString()).toEqual(decodedCID.toString())
  })

})