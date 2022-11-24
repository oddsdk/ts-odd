import * as Uint8arrays from "uint8arrays"
import * as fc from "fast-check"
import { BloomFilter } from "fission-bloom-filters"
import expect from "expect"

import * as namefilter from "./namefilter.js"
import { crypto } from "../../../../tests/helpers/components.js"


describe("hex bloom filter conversion", () => {

  before(() => {
    fc.configureGlobal({ numRuns: 10000 })
  })

  after(() => {
    fc.resetConfigureGlobal()
  })

  /** Round trip hex to bloom filter
   * The bloom filter implementation likely drops the last digit of odd-length hex strings
   * because the last digit would only encode half a byte. We therefore only test even-length
   * hex strings here.
   */
  it("round trip hex to bloom filter", async () => {
    fc.assert(
      fc.property(fc.hexaString({ minLength: 2 }).filter(str => str.length % 2 == 0), originalHex => {
        const filter = namefilter.fromHex(originalHex)
        const returnHex = namefilter.toHex(filter)
        expect(returnHex).toBe(originalHex)
      })
    )
  })
})

describe("bare filters", () => {
  it("a new filter with one entry has 16 bits set", async () => {
    fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async key => {
        const filter = await namefilter.createBare(crypto, Uint8arrays.fromString(key, "utf8"))

        const bloomFilter = namefilter.fromHex(filter)
        const onesCount = countOnes(bloomFilter)
        expect(onesCount).toEqual(16)
      })
    )
  })

  it("a filter with two entries has between 16 and 32 bits set", async () => {
    fc.assert(
      fc.asyncProperty(fc.tuple(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 })
      ), async ([ first, second ]) => {
        let filter = await namefilter.createBare(crypto, Uint8arrays.fromString(first, "utf8"))
        filter = await namefilter.addToBare(crypto, filter, Uint8arrays.fromString(second, "utf8"))

        const bloomFilter = namefilter.fromHex(filter)
        const onesCount = countOnes(bloomFilter)
        expect(onesCount).toBeGreaterThanOrEqual(16)
        expect(onesCount).toBeLessThanOrEqual(32)
      })
    )
  })

  it("a filter with n entries has between 16 and n*16 bits set", async () => {
    fc.assert(
      fc.asyncProperty(fc.array(
        fc.string({ minLength: 1 }), { minLength: 1, maxLength: 40 }
      ), async keys => {
        const n = keys.length

        let filter = await namefilter.createBare(crypto, Uint8arrays.fromString(keys[ 0 ], "utf8"))
        keys.slice(1).forEach(async key => {
          filter = await namefilter.addToBare(crypto, filter, Uint8arrays.fromString(key, "utf8"))
        })

        const bloomFilter = namefilter.fromHex(filter)
        const onesCount = countOnes(bloomFilter)
        expect(onesCount).toBeGreaterThanOrEqual(16)
        expect(onesCount).toBeLessThanOrEqual(n * 16)
      })
    )
  })
})

describe("revision filters", () => {
  it("add revision adds one entry", async () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1 }),
        async (key, revision) => {
          const filter = await namefilter.createBare(crypto, Uint8arrays.fromString(key, "base64pad"))
          const revisionFilter = await namefilter.addRevision(crypto, filter, Uint8arrays.fromString(key, "base64pad"), revision)

          const bloomFilter = namefilter.fromHex(revisionFilter)
          const onesCount = countOnes(bloomFilter)
          expect(onesCount).toBeGreaterThanOrEqual(16)
          expect(onesCount).toBeLessThanOrEqual(32)
        })
    )
  })
})

/** Helper functions
 * These helper functions MUST match the implementations in namefilter.ts!
 */

// count the number of 1 bits in a filter
const countOnes = (filter: BloomFilter): number => {
  const arr = new Uint32Array(filter.toBytes())
  let count = 0
  for (let i = 0; i < arr.length; i++) {
    count += bitCount32(arr[ i ])
  }
  return count
}

// counts the number of 1s in a uint32
// from: https://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetParallel
const bitCount32 = (num: number): number => {
  const a = num - ((num >> 1) & 0x55555555)
  const b = (a & 0x33333333) + ((a >> 2) & 0x33333333)
  return ((b + (b >> 4) & 0xF0F0F0F) * 0x1010101) >> 24
}