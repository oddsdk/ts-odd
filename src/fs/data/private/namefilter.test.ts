import expect from "expect"
import * as fc from "fast-check"
import * as uint8arrays from "uint8arrays"
import * as crypto from "crypto"

import * as bloom from "./bloomfilter.js"
import * as namefilter from "./namefilter.js"
import { webcrypto } from "./webcrypto.js"


describe("the namefilter module", () => {

  const limit = namefilter.SATURATION_THRESHOLD
  const k = bloom.wnfsParameters.kHashes
  const min = limit - k
  const max = limit

  it(`has the property ${min} < countOnes(saturate(filter)) <= ${max}`, async () => {
    await fc.assert(fc.asyncProperty(
      arbitraryAlmostEmptyBloomFilter(),
      async initialFilter => {
        const saturated = await namefilter.saturate(initialFilter)
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
        const saturatedFast = await namefilter.saturate(initialFilter)
        const saturatedSlow = await namefilter.slowStepSaturate(initialFilter)
        expect(saturatedFast).toEqual(saturatedSlow)
      }
    ))
  })

  it("has a saturation collision rate", async () => {
    const numRuns = 1000000
    const type: "re-hash" | "filter-hash" = "filter-hash"
    const algorithm: "sha2" | "sha3" = "sha3"
    const collisions: { filter: string; popcount: number}[] = []
    await fc.assert(fc.asyncProperty(
      arbitraryAlmostEmptyBloomFilter(),
      async filter => {
        
        let hash = algorithm.includes("sha3")
          ? crypto.createHash("SHA3-256").update(filter).digest()
          : await webcrypto.digest("sha-256", filter)
        
          let ones = bloom.countOnes(filter)

        while (ones < namefilter.SATURATION_THRESHOLD) {
          bloom.add(new Uint8Array(hash), filter, bloom.wnfsParameters)

          if (type.includes("re-hash")) {
            hash = algorithm.includes("sha3")
              ? crypto.createHash("SHA3-256").update(hash).digest()
              : await webcrypto.digest("sha-256", hash)
          } else {
            hash = algorithm.includes("sha3")
              ? crypto.createHash("SHA3-256").update(filter).digest()
              : await webcrypto.digest("sha-256", filter)
          }

          const onesAfter = bloom.countOnes(filter)
          if (onesAfter === ones) {
            collisions.push({
              filter: uint8arrays.toString(filter, "hex"),
              popcount: onesAfter,
            })
            return
          }
          ones = onesAfter
        }
      }
    ), { numRuns })

    console.log(JSON.stringify({ type, algorithm, numRuns, collisions, count: collisions.length }, null, 4))
  })

})

function arbitraryAlmostEmptyBloomFilter(): fc.Arbitrary<bloom.BloomFilter> {
  return fc.uint8Array({ minLength: 32, maxLength: 32 }).map(seed => {
    const filter = bloom.empty(bloom.wnfsParameters)
    bloom.add(seed, filter, bloom.wnfsParameters)
    return filter
  })
}
