import expect from "expect"
import { CID } from "multiformats/cid"

import { createIPFSBlockStore } from "./blockStore.js"
import * as metadata from "./metadata.js"

import { loadCAR } from "../../../tests/helpers/loadCAR.js"
import { ipfsFromContext } from "../../../tests/mocha-hook.js"


describe("the data metadata module", () => {

  it("round trips to/from IPFS", async function () {
    const ipfs = ipfsFromContext(this)
    const store = createIPFSBlockStore(ipfs)

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
    const metadataCID = await metadata.metadataToCID(original, store)
    const decoded = await metadata.metadataFromCID(metadataCID, store)
    expect(decoded).toEqual(original)
  })

  // FIXME: Figure out how to do different ipld codecs (i.e. allow 'raw' and dag-pb to coexist)
  it("round trips from/to IPFS", async function () {
    const ipfs = ipfsFromContext(this)
    const store = createIPFSBlockStore(ipfs)

    const car = await loadCAR("tests/fixtures/webnative-integration-test.car", ipfs)
    const [root] = car.roots

    if (root == null) {
      expect(root).toBeDefined()
      return
    }

    // Fails for some reason??? Works on the command line
    // const metadataPath = `/ipfs/${root.toString()}/public/metadata`
    // const exampleCID = await ipfs.resolve(metadataPath)
    const exampleCID = CID.parse("bafkreifn7hwfiuvb2kuff4cv4yeqlbnoux7mfyhhu634l7nikrpzegvyhm")
    const decoded = await metadata.metadataFromCID(exampleCID, store)
    const decodedCID = await metadata.metadataToCID(decoded, store)
    expect(exampleCID.toString()).toEqual(decodedCID.toString())
  })

})