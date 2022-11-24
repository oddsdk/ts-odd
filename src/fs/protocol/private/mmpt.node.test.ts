import * as DagPB from "@ipld/dag-pb"
import { CID } from "multiformats/cid"
import expect from "expect"
import crypto from "crypto"

import { depot, manners } from "../../../../tests/helpers/components.js"
import MMPT from "./mmpt.js"


function sha256Str(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex")
}

function encode(str: string): Uint8Array {
  return (new TextEncoder()).encode(str)
}


/*
Generates lots of entries for insertion into the MMPT.

The MMPT is a glorified key-value store.

This returns an array of key-values sorted by the key,
so that key collisions are more likely to be tested.
*/
async function generateExampleEntries(amount: number): Promise<{ name: string; cid: CID }[]> {
  const entries: { name: string; cid: CID }[] = []

  for (const i of Array(amount).keys()) {
    const hash = sha256Str(`${i}`)
    const node = { Data: encode(hash), Links: [] }
    const cid = await depot.putBlock(DagPB.encode(node), DagPB.code)
    entries.push({
      name: hash,
      cid: cid,
    })
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name))
}



describe("the mmpt", function () {

  it("can handle concurrent adds", async function () {
    const mmpt = MMPT.create(depot)

    // Generate lots of entries
    const amount = 500
    const entries = await generateExampleEntries(amount)

    // Concurrently add all those entries to the MMPT
    await Promise.all(entries.map(entry => mmpt.add(entry.name, entry.cid)))

    // Check that the MMPT contains all entries we added
    const members = await mmpt.members()
    const keys = members.map(member => member.name).sort()
    const intputKeys = entries.map(entry => entry.name).sort()

    expect(keys).toStrictEqual(intputKeys)
  })

  // This test used to generate even more data races
  it("can handle concurrent adds in batches", async function () {
    const mmpt = MMPT.create(depot)

    // Generate lots of entries
    const amount = 500
    const entries = await generateExampleEntries(amount)

    const slice_size = 5
    let soFar: { name: string; cid: CID }[] = []
    let missing: { name: string; cid: CID }[] = []

    for (let i = 0; i < entries.length; i += slice_size) {
      const slice = entries.slice(i, i + slice_size)
      await Promise.all(slice.map(entry => mmpt.add(entry.name, entry.cid)))
      soFar = soFar.concat(slice)
      const members = await mmpt.members()

      missing = soFar.filter(({ name }) => !members.some(mem => mem.name === name))

      if (missing.length > 0) {
        break
      }
    }

    expect(missing.length).toStrictEqual(0)

    const reconstructedMMPT = await MMPT.fromCID(depot, await mmpt.put())

    const reMembers = await reconstructedMMPT.members()
    missing = soFar.filter(({ name }) => !reMembers.some(mem => mem.name === name))

    expect(missing.length).toStrictEqual(0)
  })

  // reconstructing from CID causes the MMPT to be in a weird
  // half-in-memory half-in-ipfs state where not all branches are fetched
  // that's worth testing for sure
  it("can handle concurrent adds when reconstructed from CID", async function () {
    const firstMMPT = MMPT.create(depot)
    for (const entry of await generateExampleEntries(500)) {
      await firstMMPT.add(entry.name, entry.cid)
    }

    // Reconstruct an MMPT from a CID. This causes it to only fetch branches from ipfs on-demand
    const reconstructedMMPT = await MMPT.fromCID(depot, await firstMMPT.put())

    // Test asynchronous adds
    const entries = await generateExampleEntries(500)
    await Promise.all(entries.map(entry => reconstructedMMPT.add(entry.name, entry.cid)))

    // Check that the MMPT contains all entries we added
    const members = await reconstructedMMPT.members()
    const keys = members.map(member => member.name).sort()
    const intputKeys = entries.map(entry => entry.name).sort()

    expect(keys).toStrictEqual(intputKeys)
  })

})
