import expect from "expect"
import * as fc from "fast-check"

import * as uint8arrays from "uint8arrays"
import * as bloom from "./bloomfilter.js"


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
        fc.array(fc.uint8Array(), { minLength: 1, maxLength: 47 }),
        randomByteArrays => {
          const filter = bloom.empty(bloom.wnfsParameters)
          for (const byteArray of randomByteArrays) {
            bloom.add(byteArray, filter, bloom.wnfsParameters)
          }
          for (const byteArray of randomByteArrays) {
            expect(bloom.has(byteArray, filter, bloom.wnfsParameters)).toBe(true)
          }
        }
      )
    )
  })

  it("mostly doesn't consider having elements not added to it", () => {
    fc.assert(
      fc.property(
        fc.record({
          toAdd: fc.array(fc.uint8Array(), { minLength: 1, maxLength: 47 }),
          notToAdd: fc.array(fc.uint8Array(), { minLength: 1, maxLength: 47 }),
        }).noShrink(),

        ({ toAdd, notToAdd }) => {
          const filter = bloom.empty(bloom.wnfsParameters)

          for (const byteArrayToAdd of toAdd) {
            bloom.add(byteArrayToAdd, filter, bloom.wnfsParameters)
          }
          for (const byteArrayToAdd of toAdd) {
            expect(bloom.has(byteArrayToAdd, filter, bloom.wnfsParameters)).toBe(true)
          }

          const falsePositives = notToAdd.filter(byteArray =>
            // we didn't add it already
            !toAdd.find(arr => uint8arrays.equals(arr, byteArray))
            // but it's included
              && bloom.has(byteArray, filter, bloom.wnfsParameters)
          )
          // The false positive rate should be at 0.0000001%
          expect(falsePositives).toEqual([])
        }
      )
    )
  })

})