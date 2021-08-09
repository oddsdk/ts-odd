import expect from "expect"
import { CID } from "ipfs-core"
import { ipfsFromContext } from "../../../tests/mocha-hook.js"

import * as links from "./links.js"


describe("the data links module", () => {

  it("round trips to/from IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const exampleLinks: links.Links<null> = {
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

})

function canonicalize<T>(links: links.Links<T>): unknown {
  return JSON.parse(JSON.stringify(links, (key, value) => {
    if (key === "cid") {
      return new CID(value.version, value.codec, value.hash).toBaseEncodedString()
    }
    return value
  }))
}
