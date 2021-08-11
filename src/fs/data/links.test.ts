import expect from "expect"
import { CID } from "ipfs-core"
import { ipfsFromContext } from "../../../tests/mocha-hook.js"

import { UnixFSLink, linksFromCID, linksToCID } from "./links.js"


describe("the data links module", () => {

  it("round trips links to/from IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const exampleLinks: Record<string, UnixFSLink<CID>> = {
      "Apps": {
        data: new CID("bafybeihpi5x4nkga6cudm3rbbdemzwgfek3acf6znxki7upqbdue7rah7q"),
        size: 4691136110695
      },
      "Documents": {
        data: new CID("bafybeicoshytteexlk46wsp6irzq4666z5fulzjppifaligke2d3lu6wsq"),
        size: 421198445
      }
    }

    const cid = await linksToCID(exampleLinks, { ipfs })
    const decodedLinks = await linksFromCID(cid, { ipfs })
    expect(canonicalize(decodedLinks)).toEqual(canonicalize(exampleLinks))
  })

  it("round trips links from/to IPFS", async function () {
    const ipfs = ipfsFromContext(this)

    const exampleCID = new CID("bafybeiet7qvca6hqzwfbzm5w6qzg3deucm7lsob2nuum7nohgu67e64z4u")
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
