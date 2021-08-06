import expect from "expect"
import { CID, IPFS } from "ipfs-core"

import { loadCAR } from "../../../tests/helpers/loadCAR.js"
import { createInMemoryIPFS } from "../../../tests/helpers/in-memory-ipfs.js"

import * as metadata from "./metadata.js"


describe("metadata", () => {

  let ipfs: IPFS | null = null

  before(async function () {
    ipfs = await createInMemoryIPFS()
  })

  after(async () => {
    if (ipfs == null) return
    await ipfs.stop()
  })


  it("round trips to/from IPFS", async () => {
    if (ipfs == null) {
      expect(ipfs).not.toBe(null)
      return
    }

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

  it("successfully reads existing metadata", async () => {
    if (ipfs == null) {
      expect(ipfs).not.toBe(null)
      return
    }

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