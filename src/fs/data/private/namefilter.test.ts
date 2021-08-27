import expect from "expect"
import * as fc from "fast-check"

import * as bloom from "./bloomfilter.js"
import { getCrypto } from "./context.js"
import * as namefilter from "./namefilter.js"


describe("the namefilter module", () => {

  const ctx = getCrypto()
  const limit = namefilter.SATURATION_THRESHOLD
  const k = bloom.wnfsParameters.kHashes
  const min = limit - k
  const max = limit

  it(`has the property ${min} < countOnes(saturate(filter)) <= ${max}`, async () => {
    await fc.assert(fc.asyncProperty(
      arbitraryAlmostEmptyBloomFilter(),
      async initialFilter => {
        const saturated = await namefilter.saturate(initialFilter, ctx)
        const ones = bloom.countOnes(saturated)
        expect(ones).toBeGreaterThan(min)
        expect(ones).toBeLessThanOrEqual(max)
      }
    ))
  })

  it("has the property saturate(x) == slowStepSaturate(x)", async () => {
    await fc.assert(fc.asyncProperty(
      arbitraryAlmostEmptyBloomFilter(),
      async initialFilter => {
        const saturatedFast = await namefilter.saturate(initialFilter, ctx)
        const saturatedSlow = await namefilter.slowStepSaturate(initialFilter, ctx)
        expect(saturatedFast).toEqual(saturatedSlow)
      }
    ))
  })

})

function arbitraryAlmostEmptyBloomFilter(): fc.Arbitrary<bloom.BloomFilter> {
  return fc.uint8Array({ minLength: 32, maxLength: 32 }).map(seed => {
    const filter = bloom.empty(bloom.wnfsParameters)
    bloom.add(seed, filter, bloom.wnfsParameters)
    return filter
  })
}
