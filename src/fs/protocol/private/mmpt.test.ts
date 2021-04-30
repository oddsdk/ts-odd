import crypto from "crypto"
import Ipfs, { IPFS } from "ipfs"

import MMPT from "./mmpt"
import * as ipfsConfig from "../../../ipfs/config"

function sha256Str(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex')
}

function encode(str: string): Uint8Array {
  return (new TextEncoder()).encode(str)
}

let ipfs: IPFS;

beforeAll(async done => {
  ipfs = await Ipfs.create({ offline: true, silent: true })
  ipfsConfig.set(ipfs)
  done()
})

afterAll(async done => {
  ipfs.stop()
  done()
})

describe("the mmpt", () => {
  it("can handle concurrent adds", async () => {
    const mmpt = MMPT.create()

    // Generate lots of entries
    const amount = 1000
    let entries: { name: string, cid: string }[] = []

    for (const i of Array(amount).keys()) {
      const hash = sha256Str(`${i}`)
      const cid = await ipfs.object.put({ Data: encode(hash), Links: [] })
      entries.push({
        name: hash,
        cid: cid.toBaseEncodedString(),
      })
    }

    // Concurrently add all those entries to the MMPT
    await Promise.all(entries.map(entry => mmpt.add(entry.name, entry.cid)))

    // Check that the MMPT contains all entries we added
    const members = await mmpt.members()
    const hashes = members.map(member => member.cid).sort()
    const inputHashes = entries.map(entry => entry.cid).sort()

    expect(hashes).toStrictEqual(inputHashes)
  })
})
