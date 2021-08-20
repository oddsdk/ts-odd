import expect from "expect"
import * as fc from "fast-check"

// @ts-ignore
import xxhash from "xxhashjs"
import * as uint8arrays from "uint8arrays"
import * as bloom from "./bloomfilter.js"


function hashToUint8Array(uint64: any): Uint8Array {
  const asHex = uint64.toString(16)
  return uint8arrays.fromString("0".repeat(16 - asHex.length) + asHex, "hex")
}

function hashToUint8Array2(uint64: any): Uint8Array {
  const asArray = new Uint8Array(8)
  const view = new DataView(asArray.buffer)
  // big endian
  view.setUint16(6, uint64._a00, false)
  view.setUint16(4, uint64._a16, false)
  view.setUint16(2, uint64._a32, false)
  view.setUint16(0, uint64._a48, false)
  return asArray
}

describe("the bloom filter module", () => {

  before(async function () {
    fc.configureGlobal({ numRuns: 1000 })
  })

  after(async () => {
    fc.resetConfigureGlobal()
  })


  it("has all the elements added to it", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 47 }),
        randomStrings => {
          const filter = bloom.empty(bloom.wnfsParameters)
          const hashes = randomStrings.map(str => hashToUint8Array(xxhash.h64(str, 0)))
          for (const hash of hashes) {
            bloom.add(hash.buffer, filter, bloom.wnfsParameters)
          }
          for (const hash of hashes) {
            expect(bloom.has(hash.buffer, filter, bloom.wnfsParameters)).toBe(true)
          }
        }
      )
    )
  })

  it("mostly doesn't consider having elements not added to it", () => {
    fc.assert(
      fc.property(
        fc.record({
          toAdd: fc.array(fc.string(), { minLength: 1, maxLength: 47 }),
          notToAdd: fc.array(fc.string(), { minLength: 1, maxLength: 47 }),
        }).noShrink(),

        ({ toAdd, notToAdd }) => {
          const filter = bloom.empty(bloom.wnfsParameters)
          const hashesToAdd = toAdd.map(str => hashToUint8Array(xxhash.h64(str, 0)))
          const hashesNotToAdd = notToAdd.map(str => hashToUint8Array(xxhash.h64(str, 0)))

          for (const hash of hashesToAdd) {
            bloom.add(hash.buffer, filter, bloom.wnfsParameters)
          }
          for (const hash of hashesToAdd) {
            expect(bloom.has(hash.buffer, filter, bloom.wnfsParameters)).toBe(true)
          }

          const falsePositives = hashesNotToAdd.filter(hash => bloom.has(hash.buffer, filter, bloom.wnfsParameters)).length
          expect(falsePositives).toBe(0)
        }
      )
    )
  })

})