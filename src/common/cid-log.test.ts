import * as fc from 'fast-check'
import CID from 'cids'
import multihash from 'multihashing-async'
import * as cidLog from './cid-log'


// Not tested: clear

// jest.mock('localforage')

beforeAll(async done => {
  await cidLog.clear()
  done()
})

test('simple', async () => {
  const makeCid = async (data) => {
    const mhash = await multihash(data, 'sha2-256')
    const cid = new CID(1, 'dag-pb', mhash)
    return cid.toString()
  }

  const promisedCids = ['test1', 'test2'].map(str => makeCid(str))
  const cids = await Promise.all(promisedCids)

  // Sequence promises to keep them in order. Add prepends, so we start from the right. 
  const doneAdding = cids.reduceRight(async (acc, cid) => {
    return acc.then(() =>  cidLog.add(cid))
  }, Promise.resolve())

  // Resolve the ordered promise chain and get the result
  const log = await doneAdding.then(async () => await cidLog.get())

  expect(log).toEqual(cids)
})

test('adds cids and gets an ordered log', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.array(fc.uint8Array({ maxLength: 100 }), { maxLength: 10 }), async data => {
        await cidLog.clear()

        const promisedCids = data.map(async bytes => {
          const mhash = await multihash(bytes, 'sha2-256')
          const cid = new CID(1, 'dag-pb', mhash)
          return cid.toString()
        })
        const cids: string[] = await Promise.all(promisedCids)

        // localforage.getItem.mockResolvedValue(cids)
        const doneAdding = cids.reduceRight(async (acc, cid) => {
          return acc.then(() =>  cidLog.add(cid))
        }, Promise.resolve())

        const log = await doneAdding.then(async () => await cidLog.get())

        // await Promise.all(cids.map(cid => { console.log(cid); return cidLog.add(cid) }))
        // await cids.forEach(async cid => { console.log(cid); return await cidLog.add(cid) })

        // const log = await cidLog.get()
        // console.log(cids + '\n -- \n' + log)
        expect(log).toEqual(cids)
      })
  )
})

// test('gets cid log', async () => {
//   fc.assert(
//     fc.asyncProperty(
//       fc.array(fc.uint8Array({ maxLength: 100 }), { maxLength: 10 }), async data => {
//         const promisedCids = data.map(async bytes => {
//           const mhash = await multihash(bytes, 'sha2-256')
//           const cid = new CID(1, 'dag-pb', mhash)
//           return cid.toString()
//         })
//         const cids: string[] = await Promise.all(promisedCids)

//         // localforage.getItem.mockResolvedValue(cids)
//         // await Promise.all(cids.map(cid => { console.log(cid); return cidLog.add(cid) }))
//         await cids.forEach(async cid => { console.log(cid); return await cidLog.add(cid) })

//         const log = await cidLog.get()
//         // console.log(cids + '\n -- \n' + log)
//         expect(log).toEqual(cids)
//       })
//   )
// })

// test('gets an empty log when key is missing', async () => {
//   localforage.getItem.mockResolvedValue(null)
//   const log = await cidLog.get()
//   expect(log).toEqual([])
// })


// test('gets index of a cid', async () => {
//   fc.assert(
//     fc.asyncProperty(
//       fc.array(fc.uint8Array({ maxLength: 100 }), { minLength: 1, maxLength: 10 }), async data => {
//         const promisedCids = data.map(async bytes => {
//           const mhash = await multihash(bytes, 'sha2-256')
//           const cid = new CID(1, 'dag-pb', mhash)
//           return cid.toString()
//         })
//         const cids: string[] = await Promise.all(promisedCids)
//         localforage.getItem.mockResolvedValue(cids)

//         const idx = Math.floor(Math.random() * data.length)
//         const cid = cids[idx]

//         const index = await cidLog.index(cid.toString())
//         expect(index).toEqual([idx, data.length])
//       })
//   )
// })


// test('gets the newest cid', async () => {
//   fc.assert(
//     fc.asyncProperty(
//       fc.array(fc.uint8Array({ maxLength: 100 }), { minLength: 1, maxLength: 10 }), async data => {
//         const promisedCids = data.map(async bytes => {
//           const mhash = await multihash(bytes, 'sha2-256')
//           const cid = new CID(1, 'dag-pb', mhash)
//           return cid.toString()
//         })
//         const cids: string[] = await Promise.all(promisedCids)
//         localforage.getItem.mockResolvedValue(cids)

//         const cid = cids[0]

//         const newest = await cidLog.newest()
//         expect(newest).toEqual(cid)
//       })
//   )
// })

// test('adds a cid', async () => {
//   fc.assert(
//     fc.asyncProperty(
//       fc.frequency(
//         { arbitrary: fc.array(fc.uint8Array({ maxLength: 100 }), { minLength: 1, maxLength: 10 }), weight: 100 },
//         { arbitrary: fc.array(fc.uint8Array({ maxLength: 100 }), { minLength: 1001, maxLength: 1001 }), weight: 1 }
//       ), async data => {
//         const promisedCids = data.map(async bytes => {
//           const mhash = await multihash(bytes, 'sha2-256')
//           const cid = new CID(1, 'dag-pb', mhash)
//           return cid.toString()
//         })
//         const cids: string[] = await Promise.all(promisedCids)
//         const cidToAdd = cids[0]
//         const initialCids = cids.slice(1)

//         // The call to add needs a mock getItem and setItem. We start off with an initial
//         // set of a of cids and a mock setItem that gets us access to newItem inside the 
//         // add implementation.
//         let log: string[];
//         localforage.getItem.mockResolvedValue(initialCids)
//         localforage.setItem.mockImplementation((key, newLog: string[]) =>
//           log = newLog
//         )
//         await cidLog.add(cidToAdd)

//         // We expect the resulting log to equal the full set of cids up to 1000 CIDs
//         if (cids.length <= 1000) {
//           expect(log).toEqual(cids)
//         } else {
//           expect(log).toEqual(cids.slice(0, 1000))
//         }
//       })
//   )
// })
