import expect from "expect"
import CID from "cids"
import { loadCAR } from "../../../tests/helpers/loadCAR.js"
import { ipfsFromContext } from "../../../tests/mocha-hook.js"

import { linksFromCID, linksToCID } from "./links.js"


describe("the data links module", () => {

  it("round trips links to/from IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const exampleLinks: Record<string, CID> = {
      "Apps": new CID("bafkqaaa"),
      "Documents": new CID("bafkqaaa"),
    }

    const cid = await linksToCID(exampleLinks, { ipfs })
    const decodedLinks = await linksFromCID(cid, { ipfs })
    expect(canonicalize(decodedLinks)).toEqual(canonicalize(exampleLinks))
  })

  it("round trips links from/to IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    await loadCAR("tests/fixtures/webnative-integration-test.car", ipfs)

    // ^ root/public/userland
    const exampleCID = new CID("bafybeig6m5w57qpp7pj3kcrban74bhbjittr46nkxqgpuqx2o4ymieysem")
    const decodedLinks = await linksFromCID(exampleCID, { ipfs })
    const cid = await linksToCID(decodedLinks, { ipfs })
    expect(cid.toString()).toEqual(exampleCID.toString())
  })

})

export function canonicalize(object: unknown): unknown {
  return JSON.parse(JSON.stringify(object, (key, value) => {
    if (value && value.version && value.codec && value.hash) {
      return new CID(value.version, value.codec, value.hash).toString()
    }
    if (value && value.toObject) {
      return value.toObject()
    }
    return value
  }))
}
