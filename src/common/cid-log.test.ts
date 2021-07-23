import * as fc from 'fast-check'
import CID from 'cids'
import multihash from 'multihashing-async'
import * as cidLog from './cid-log.js'
import * as storage from '../storage/index.js'

async function generateCids(data: Uint8Array[]): Promise<string[]> {
  const promisedCids = data.map(async bytes => {
    const mhash = await multihash(bytes, 'sha2-256')
    const cid = new CID(1, 'dag-pb', mhash)
    return cid.toString()
  })
  return Promise.all(promisedCids)
}

test('gets an empty log when key is missing', async () => {
  await storage.clear()

  const log = await cidLog.get()
  expect(log).toEqual([])
})

test('adds cids and gets an ordered log', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.uint8Array({ maxLength: 100 }), { maxLength: 10 }), async data => {
        await storage.clear()

        // Generate CIDs from test data
        const cids: string[] = await generateCids(data)

        // Sequence add operations to keep the CIDs in order
        // Start from the right because add prepends cids
        const doneAdding = cids.reduceRight(async (acc, cid) => {
          return acc.then(() => cidLog.add(cid))
        }, Promise.resolve())

        // Get the log after all CIDs have been added
        const log = await doneAdding.then(async () => await cidLog.get())

        expect(log).toEqual(cids)
      })
  )
})

test('gets index of a cid', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.uint8Array({minLength:1, maxLength: 100 }), { minLength: 1, maxLength: 10 }), async data => {
        await storage.clear()

        const cids: string[] = await generateCids(data)
        const doneAdding = cids.reduceRight(async (acc, cid) => {
          return acc.then(() => cidLog.add(cid))
        }, Promise.resolve())

        const idx = Math.floor(Math.random() * data.length)
        const cid = cids[idx]

        // Get the index of test cid after all CIDs have been added
        const index = await doneAdding.then(async () => await cidLog.index(cid.toString()))

        expect(index).toEqual([idx, data.length])
      })
  )
})

test('gets the newest cid', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.uint8Array({ maxLength: 100 }), { minLength: 1, maxLength: 10 }), async data => {
        await storage.clear()

        const cids: string[] = await generateCids(data)
        const doneAdding = cids.reduceRight(async (acc, cid) => {
          return acc.then(() => cidLog.add(cid))
        }, Promise.resolve())

        const cid = cids[0]

        // Get the newest cid after all CIDs have been added
        const newest = await doneAdding.then(async () => await cidLog.newest())

        expect(newest).toEqual(cid)
      })
  )
})

test('drops older cids when cid log reaches 1000 entries', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.uint8Array({ maxLength: 100 }), { minLength: 1001, maxLength: 1003 }), async data => {
        await storage.clear()

        const cids: string[] = await generateCids(data)
        const doneAdding = cids.reduceRight(async (acc, cid) => {
          return acc.then(() => cidLog.add(cid))
        }, Promise.resolve())

        // Get the log after all CIDs have been added
        const log = await doneAdding.then(async () => await cidLog.get())

        // Expect only the newest 1000 CIDs to be left
        expect(log).toEqual(cids.slice(0, 1000))
      }),
      { numRuns: 2 }
  )
})

test('clears the cid log', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.uint8Array({ maxLength: 100 }), { maxLength: 5 }), async data => {
        await storage.clear()

        const cids: string[] = await generateCids(data)
        const doneAdding = cids.reduceRight(async (acc, cid) => {
          return acc.then(() => cidLog.add(cid))
        }, Promise.resolve())

        // Clear the log and get it after all CIDs have been added
        const log = await doneAdding.then(async () => {
          await cidLog.clear()
          return cidLog.get()
        })

        expect(log).toEqual([])
      })
  )
})