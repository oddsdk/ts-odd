import * as DagCBOR from "@ipld/dag-cbor"
import * as fc from "fast-check"
import { CID } from "multiformats/cid"
import { sha256 } from "multiformats/hashes/sha2"
import expect from "expect"

import * as CIDLog from "./cid-log.js"
import { storage } from "../../tests/helpers/components.js"


async function generateCids(data: Uint8Array[]): Promise<CID[]> {
  const promisedCids = data.map(async bytes => {
    const encoded = DagCBOR.encode(bytes)
    const mhash = await sha256.digest(encoded)
    return CID.createV1(DagCBOR.code, mhash)
  })
  return Promise.all(promisedCids)
}


function isEqualCIDsSet(a: CID[], b: CID[]) {
  return expect(a.map(c => c.toString())).toEqual(b.map(c => c.toString()))
}


describe("cid-log", () => {

  let cidLog: CIDLog.Repo

  before(async () => {
    cidLog = await CIDLog.create({ storage })
    await cidLog.clear()
  })

  it("gets an empty log when key is missing", async () => {
    const log = await cidLog.getAll()
    expect(log).toEqual([])
  })

  it("adds cids and gets an ordered log", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uint8Array({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }), async data => {
          await cidLog.clear()

          const cids: CID[] = await generateCids(data)
          await cidLog.add(cids)

          const log = await cidLog.getAll()

          isEqualCIDsSet(log, cids)
        })
    )
  })

  it("gets index of a cid", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uint8Array({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }), async data => {
          await cidLog.clear()

          const cids: CID[] = await generateCids(data)
          await cidLog.add(cids)

          const idx = Math.floor(Math.random() * data.length)
          const cid = cids[ idx ]

          // Get the index of test cid after all CIDs have been added
          const index = cidLog.indexOf(cid)

          expect(index).toEqual(idx)
        })
    )
  })

  it("gets the newest cid", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uint8Array({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }), async data => {
          await cidLog.clear()

          const cids: CID[] = await generateCids(data)
          await cidLog.add(cids)

          const cid = cids[ cids.length - 1 ]

          // Get the newest cid after all CIDs have been added
          const newest = cidLog.newest()

          expect(newest.toString()).toEqual(cid.toString())
        })
    )
  })

  it("clears the cid log", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uint8Array({ minLength: 1, maxLength: 100 }), { maxLength: 5 }), async data => {
          await cidLog.clear()

          const cids: CID[] = await generateCids(data)
          await cidLog.add(cids)

          // Clear the log and get it after all CIDs have been added
          await cidLog.clear()
          const log = await cidLog.getAll()

          isEqualCIDsSet(log, [])
        })
    )
  })
})
