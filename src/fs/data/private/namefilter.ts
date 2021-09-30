import * as bloom from "./bloomfilter.js"
import { webcrypto } from "./webcrypto.js"


export function empty(): bloom.BloomFilter {
  return bloom.empty(bloom.wnfsParameters)
}

export const SATURATION_THRESHOLD = 1019

export async function saturate(bareFilter: bloom.BloomFilter): Promise<bloom.BloomFilter> {
  // The point of saturation is to have as close to SATURATION_THRESHOLD bits set as possible, ideally exactly that number
  // We can't hit that number exactly every time, because we can't know how many *new* bits will be set with the next add.

  const workingFilter = new Uint8Array(bareFilter)
  let ones = bloom.countOnes(workingFilter)
  if (ones >= SATURATION_THRESHOLD) return workingFilter

  // When we know we have e.g. 0 bits set, and want to e.g. get at least 300 bits
  // we can skip checking how many new bits we got every time for the first 10 iterations,
  // because *at maxium* we get 30 bits set (assuming kHashes == 30).
  // Thus, this is an optimization to reduce the amount of bloom.countOnes calls
  let remainingStepsAtLeast = Math.floor((SATURATION_THRESHOLD - ones) / bloom.wnfsParameters.kHashes)

  while (remainingStepsAtLeast >= 1) {
    for (let i = 0; i < remainingStepsAtLeast; i++) {
      await saturationStep(workingFilter)
    }

    // theres a chance that the hash will collide with the existing filter and this gets stuck in an infinite loop
    const onesAfter = bloom.countOnes(workingFilter)
    if (onesAfter === ones) {
      // in that case keep re-hashing the hash & adding to the filter until there is no collision
      await saturationStepEnsure(workingFilter)
    }
    ones = onesAfter
    // Now that we've done e.g. 10 iterations, we might have ended up at, say 430 bits set
    // Assuming we want to end up at 600, there's still 170 more bits to go, so at least
    // floor(170 / 30) = 5 more iterations, and then etc.
    remainingStepsAtLeast = Math.floor((SATURATION_THRESHOLD - ones) / bloom.wnfsParameters.kHashes)
  }

  // Now we have a filter which has between threshold-30 and threshold bits set.
  // With that function we're adding more elements until we step *over* the limit
  // for the first time, always being carful to remember the last iteration, so we
  // can return it
  return slowStepSaturate(workingFilter)
}

export async function slowStepSaturate(filter: bloom.BloomFilter): Promise<bloom.BloomFilter> {
  const nextFilter = new Uint8Array(filter)
  await saturationStep(nextFilter)

  const onesAfter = bloom.countOnes(nextFilter)
  if (onesAfter > SATURATION_THRESHOLD) return filter

  return await slowStepSaturate(nextFilter)
}

// modifies the bloom filter in place
async function saturationStep(filter: bloom.BloomFilter): Promise<void> {
  const hash = await webcrypto.digest("sha-256", filter)
  bloom.add(new Uint8Array(hash), filter, bloom.wnfsParameters)
}

// also modifies in place
async function saturationStepEnsure(filter: bloom.BloomFilter): Promise<void> {
  const ones = bloom.countOnes(filter)
  let hash = await webcrypto.digest("sha-256", filter)
  do {
    // re-hash the hash (& we assume at least hashing twice in this situation)
    hash = await webcrypto.digest("sha-256", hash)
    bloom.add(new Uint8Array(hash), filter, bloom.wnfsParameters)
  } while (bloom.countOnes(filter) === ones)
}


export async function addToBare(bareFilter: bloom.BloomFilter, keyOrINumber: ArrayBuffer): Promise<bloom.BloomFilter> {
  const hash = await webcrypto.digest("sha-256", keyOrINumber)
  const added = new Uint8Array(bareFilter)
  bloom.add(new Uint8Array(hash), added, bloom.wnfsParameters)
  return added
}
