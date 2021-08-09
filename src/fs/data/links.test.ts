import expect from "expect"
import { CID } from "ipfs-core"
import { ipfsFromContext } from "../../../tests/mocha-hook.js"

import * as links from "./links.js"


describe("the data links module", () => {

  it("round trips to/from IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const exampleLinks: links.Links<unknown> = {
      "Apps": {
        cid: new CID("bafybeihpi5x4nkga6cudm3rbbdemzwgfek3acf6znxki7upqbdue7rah7q"),
        name: "Apps",
        size: 4691136110695
      },
      "Documents": {
        cid: new CID("bafybeicoshytteexlk46wsp6irzq4666z5fulzjppifaligke2d3lu6wsq"),
        name: "Documents",
        size: 421198445
      }
    }

    const cid = await links.toCID(exampleLinks, { ipfs })
    const decodedLinks = await links.fromCID(cid, { ipfs })
    expect(canonicalize(decodedLinks)).toEqual(canonicalize(exampleLinks))
  })

  it("round trips from/to IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const exampleCID = new CID("bafybeiet7qvca6hqzwfbzm5w6qzg3deucm7lsob2nuum7nohgu67e64z4u")
    const decodedLinks = await links.fromCID(exampleCID, { ipfs })
    const cid = await links.toCID(decodedLinks, { ipfs })
    expect(cid.toString()).toEqual(exampleCID.toString())
  })

})

export function canonicalize(object: unknown): unknown {
  return JSON.parse(JSON.stringify(object, (key, value) => {
    if (key === "cid") {
      return new CID(value.version, value.codec, value.hash).toBaseEncodedString()
    }
    return value
  }))
}
