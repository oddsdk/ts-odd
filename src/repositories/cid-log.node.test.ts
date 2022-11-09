import * as dagPB from "@ipld/dag-pb"
import * as fc from "fast-check"
import { CID } from "multiformats/cid"
import { sha256 } from "multiformats/hashes/sha2"
import expect from "expect"

import * as CIDLog from "./cid-log.js"
import { storage } from "../../tests/helpers/components.js"


async function generateCids(data: Uint8Array[]): Promise<CID[]> {
  const promisedCids = data.map(async bytes => {
    const mhash = await sha256.digest(bytes)
    return CID.createV1(dagPB.code, mhash)
  })
  return Promise.all(promisedCids)
}


describe("cid-log", () => {

  let cidLog: CIDLog.Repo

  before(() => {
    cidLog = CIDLog.create({ storage })
  })

  it("gets an empty log when key is missing", async () => {
    const log = await cidLog.getAll()
    expect(log).toEqual([])
  })

  it("adds cids and gets an ordered log", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uint8Array({ maxLength: 100 }), { maxLength: 10 }), async data => {
          await cidLog.clear()

          // Generate CIDs from test data
          const cids: CID[] = await generateCids(data)

          // Sequence add operations to keep the CIDs in order
          // Start from the right because add prepends cids
          const doneAdding = cids.reduceRight(async (acc, cid) => {
            return acc.then(() => cidLog.add(cid))
          }, Promise.resolve())

          // Get the log after all CIDs have been added
          const log = await doneAdding.then(async () => await cidLog.getAll())

          expect(log).toEqual(cids)
        })
    )
  })

  it("gets index of a cid", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uint8Array({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }), async data => {
          await cidLog.clear()

          const cids: CID[] = await generateCids(data)
          const doneAdding = cids.reduceRight(async (acc, cid) => {
            return acc.then(() => cidLog.add(cid))
          }, Promise.resolve())

          const idx = Math.floor(Math.random() * data.length)
          const cid = cids[ idx ]

          // Get the index of test cid after all CIDs have been added
          const index = await doneAdding.then(async () => await cidLog.indexOf(cid))

          expect(index).toEqual([ idx, data.length ])
        })
    )
  })

  it("gets the newest cid", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uint8Array({ maxLength: 100 }), { minLength: 1, maxLength: 10 }), async data => {
          await cidLog.clear()

          const cids: CID[] = await generateCids(data)
          const doneAdding = cids.reduceRight(async (acc, cid) => {
            return acc.then(() => cidLog.add(cid))
          }, Promise.resolve())

          const cid = cids[ 0 ]

          // Get the newest cid after all CIDs have been added
          const newest = await doneAdding.then(async () => await cidLog.newest())

          expect(newest).toEqual(cid)
        })
    )
  })

  it("drops older cids when cid log reaches 1000 entries", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uint8Array({ maxLength: 100 }), { minLength: 1001, maxLength: 1003 }), async data => {
          await cidLog.clear()

          const cids: CID[] = await generateCids(data)
          const doneAdding = cids.reduceRight(async (acc, cid) => {
            return acc.then(() => cidLog.add(cid))
          }, Promise.resolve())

          // Get the log after all CIDs have been added
          const log = await doneAdding.then(async () => await cidLog.getAll())

          // Expect only the newest 1000 CIDs to be left
          expect(log).toEqual(cids.slice(0, 1000))
        }),
      { numRuns: 2 }
    )
  })

  it("clears the cid log", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uint8Array({ maxLength: 100 }), { maxLength: 5 }), async data => {
          await cidLog.clear()

          const cids: CID[] = await generateCids(data)
          const doneAdding = cids.reduceRight(async (acc, cid) => {
            return acc.then(() => cidLog.add(cid))
          }, Promise.resolve())

          // Clear the log and get it after all CIDs have been added
          const log = await doneAdding.then(async () => {
            await cidLog.clear()
            return cidLog.getAll()
          })

          expect(log).toEqual([])
        })
    )
  })
})
