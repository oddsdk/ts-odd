import expect from "expect"
import { CID } from "multiformats/cid"
import { loadCAR } from "../../../tests/helpers/loadCAR.js"
import { canonicalize } from "../../../tests/helpers/common.js"
import { ipfsFromContext } from "../../../tests/mocha-hook.js"

import { linksFromCID, linksToCID } from "./links.js"
import { createIPFSBlockStore } from "./blockStore.js"


describe("the data links module", () => {

  it("round trips links to/from IPFS", async function () {
    const ipfs = ipfsFromContext(this)
    const store = createIPFSBlockStore(ipfs)

    const exampleLinks: Record<string, CID> = {
      "Apps": CID.parse("bafkqaaa"),
      "Documents": CID.parse("bafkqaaa"),
    }

    const cid = await linksToCID(exampleLinks, store)
    const decodedLinks = await linksFromCID(cid, store)
    expect(canonicalize(decodedLinks)).toEqual(canonicalize(exampleLinks))
  })

  it("round trips links from/to IPFS", async function () {
    const ipfs = ipfsFromContext(this)
    const store = createIPFSBlockStore(ipfs)

    await loadCAR("tests/fixtures/webnative-integration-test.car", ipfs)

    // ^ root/public/userland
    const exampleCID = CID.parse("bafybeig6m5w57qpp7pj3kcrban74bhbjittr46nkxqgpuqx2o4ymieysem")
    const decodedLinks = await linksFromCID(exampleCID, store)
    const cid = await linksToCID(decodedLinks, store)
    expect(cid.toString()).toEqual(exampleCID.toString())
  })

})

