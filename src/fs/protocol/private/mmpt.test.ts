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
  // it("can handle concurrent adds", async () => {
  //   const mmpt = MMPT.create()

  //   // Generate lots of entries
  //   const amount = 1000
  //   let entries: { name: string, cid: string }[] = []

  //   for (const i of Array(amount).keys()) {
  //     const hash = sha256Str(`${i}`)
  //     const cid = await ipfs.object.put({ Data: encode(hash), Links: [] })
  //     entries.push({
  //       name: hash,
  //       cid: cid.toBaseEncodedString(),
  //     })
  //   }

  //   // Concurrently add all those entries to the MMPT
  //   await Promise.all(entries.map(entry => mmpt.add(entry.name, entry.cid)))

  //   // Check that the MMPT contains all entries we added
  //   const members = await mmpt.members()
  //   const hashes = members.map(member => member.cid).sort()
  //   const inputHashes = entries.map(entry => entry.cid).sort()

  //   expect(hashes).toStrictEqual(inputHashes)
  // })

  it("can handle very similar hashes", async () => {
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

    entries = entries.sort((a, b) => a.name.localeCompare(b.name))

    const slice_size = 5
    let soFar = []
    let missing = []

    for(let i=0; i < entries.length; i += slice_size){
      MMPT.break(i)
      const slice = entries.slice(i, i + slice_size)
      await Promise.all(slice.map(entry => mmpt.add(entry.name, entry.cid)))
      soFar = soFar.concat(slice)
      const members = await mmpt.members()

      missing = soFar.filter(({name}) => !members.some(mem => mem.name === name))
      if(missing.length > 0) {
        break
      }
    }

    for(const miss of missing) {
      console.log("EXISTS: ", await mmpt.exists(miss.name))
    }

    console.log("MISSING: ", missing)

    expect(missing.length).toStrictEqual(0)

    const cid = await mmpt.put()

    const reGot = await MMPT.fromCID(cid)

    const reMembers = await reGot.members()
    missing = soFar.filter(({name}) => !reMembers.some(mem => mem.name === name))

    expect(missing.length).toStrictEqual(0)

    // Concurrently add all those entries to the MMPT
    // await Promise.all(entries.map(entry => mmpt.add(entry.name, entry.cid)))

    // const exists = await Promise.all(
    //   entries.map(({ name }) => mmpt.exists(name))
    // )

    // expect(exists.every(val => val === true))

    // const members = await mmpt.members()

    // const missing = entries.filter(({name}) => !members.some(mem => mem.name === name))
    // console.log('missgin LEGNTH: ', missing.length)


    // const missingExists = await Promise.all(
    //   missing.map(({ name }) => mmpt.exists(name))

    // )

    // console.log(missingExists)

    // expect(missingExists.every(val => val === true))


    // console.log("MEMBERS LENGTH: ", members.length)

    // const hashes = members.map(member => member.name).sort()
    // const inputHashes = entries.map(entry => entry.name).sort()

    // expect(hashes).toStrictEqual(inputHashes)




    // Check that the MMPT contains all entries we added
    // const members = await mmpt.members()
    // const hashes = members.map(member => member.cid).sort()
    // const inputHashes = entries.map(entry => entry.cid).sort()

    // expect(hashes).toStrictEqual(inputHashes)
  })
})
