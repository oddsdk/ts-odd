import * as uint8arrays from "uint8arrays"

import { CborForm, hasProp } from "../common.js"
import { crypto, webcrypto } from "./webcrypto.js"

export interface SpiralRatchet {
  large: ArrayBuffer

  medium: ArrayBuffer
  mediumCounter: number

  small: ArrayBuffer
  smallCounter: number
}

export interface RatchetOptions {
  seed: ArrayBuffer
  preIncrementSmall: number
  preIncrementMedium: number
}



//--------------------------------------
// Operations
//--------------------------------------


export async function toKey(ratchet: SpiralRatchet): Promise<ArrayBuffer> {
  return sha(xor(ratchet.large, xor(ratchet.medium, ratchet.small)))
}

export async function setup(options?: Partial<RatchetOptions>): Promise<SpiralRatchet> {
  let [mediumSkip, smallSkip] = crypto.getRandomValues(new Uint8Array(2))
  mediumSkip = options?.preIncrementMedium == null ? mediumSkip : options.preIncrementMedium
  smallSkip = options?.preIncrementSmall == null ? smallSkip : options.preIncrementSmall

  const ratchet = await zero({}) // random seed

  return Object.freeze({
    ...ratchet,
    medium: await shaN(ratchet.medium, mediumSkip),
    mediumCounter: mediumSkip,
    small: await shaN(ratchet.small, smallSkip),
    smallCounter: smallSkip,
  })
}

async function zero({ seed }: { seed?: ArrayBuffer }): Promise<SpiralRatchet> {
  const largePre = seed || crypto.getRandomValues(new Uint8Array(32)).buffer
  const mediumPre = await sha(complement(largePre))
  const medium = await sha(mediumPre)
  const small = await sha(complement(mediumPre))

  return Object.freeze({
    large: await sha(largePre),
    medium,
    mediumCounter: 0,
    small,
    smallCounter: 0,
  })
}


export async function inc(ratchet: SpiralRatchet): Promise<SpiralRatchet> {
  if (ratchet.smallCounter >= 255) {
    return (await nextMediumEpoch(ratchet)).jumped
  }

  return Object.freeze({
    ...ratchet,
    small: await sha(ratchet.small), // NOTE: this uses the input ratchet
    smallCounter: ratchet.smallCounter + 1,
  })
}

export async function incBy(ratchet: SpiralRatchet, n: number): Promise<SpiralRatchet> {
  if (n <= 0) return ratchet
  if (n >= 256 * 256 - combinedCounter(ratchet)) { // i.e. there *will* be a large epoch jump if we used `inc`s
    const { jumped, stepsDone } = await nextLargeEpoch(ratchet)
    return await incBy(jumped, n - stepsDone)
  }
  if (n >= 256 - ratchet.smallCounter) { // i.e. there *will* be a medium epoch jump if we used `inc`s
    const { jumped, stepsDone } = await nextMediumEpoch(ratchet)
    return await incBy(jumped, n - stepsDone)
  }
  return await incBySmall(ratchet, n)
}

export async function nextMediumEpoch(ratchet: SpiralRatchet): Promise<{ jumped: SpiralRatchet; stepsDone: number }> {
  if (ratchet.mediumCounter >= 255) {
    return await nextLargeEpoch(ratchet)
  }

  const jumped = {
    ...ratchet,

    medium: await sha(ratchet.medium), // NOTE: this uses the input ratchet
    mediumCounter: ratchet.mediumCounter + 1,

    small: await sha(complement(ratchet.medium)), // NOTE: this uses the input ratchet
    smallCounter: 0
  }
  const stepsDone = combinedCounter(jumped) - combinedCounter(ratchet)
  return { jumped, stepsDone }
}

export async function nextLargeEpoch(ratchet: SpiralRatchet): Promise<{ jumped: SpiralRatchet; stepsDone: number }> {
  const jumped = await zero({ seed: ratchet.large })
  const stepsDone = 256 * 256 - combinedCounter(ratchet)
  return { jumped, stepsDone }
}


export type SpiralSeek = {
  ratchet: SpiralRatchet
  increasedBy: number
}

/**
 * Assumes that the function `step` is monotonous, starting from `true` and ending in `false` with
 * increasing ratchets.
 *
 * I.e. step(ratchet) >= seek(incBy(ratchet, n))
 * where true >= false and true >= true
 *
 * This function will then find the number `n` where the increasing the spiral by one will make
 * `step` become false.
 *
 * I.e. it finds the number n such that
 * step(incBy(ratchet, n)) == true && step(incBy(ratchet, n+1)) == false
 */
export async function seek(ratchet: SpiralRatchet, step: (seek: SpiralSeek) => Promise<boolean>): Promise<SpiralSeek> {
  // TODO: Incorporate seek randomness. I.e. add some offsets here and there such that the seek isn't completely predictable by an attacker.
  // TODO: Make seek start with a small step, then a medium step, then a large step, and go backwards after that
  let seekState = { ratchet, increasedBy: 0 }
  seekState = await seekLarge(seekState.ratchet, step)
  seekState = await seekSubLarge(seekState, async r => (await nextMediumEpoch(r)).jumped, step)
  return await seekSubLarge(seekState, inc, step)
}

export async function seekLarge(ratchet: SpiralRatchet, step: (seek: SpiralSeek) => Promise<boolean>): Promise<SpiralSeek> {
  let currentSeek = { ratchet, increasedBy: 0 }
  let seekBefore = currentSeek

  do {
    seekBefore = currentSeek
    currentSeek = {
      ratchet: (await nextLargeEpoch(currentSeek.ratchet)).jumped,
      increasedBy: currentSeek.increasedBy + 256 * 256 - combinedCounter(currentSeek.ratchet)
    }
  } while (await step(currentSeek))

  return seekBefore
}

export async function seekSubLarge(currentSeek: SpiralSeek, increaser: (ratchet: SpiralRatchet) => Promise<SpiralRatchet>, step: (seek: SpiralSeek) => Promise<boolean>): Promise<SpiralSeek> {
  let seekBefore = currentSeek

  do {
    seekBefore = currentSeek
    const nextRatchet = await increaser(currentSeek.ratchet)
    currentSeek = {
      ratchet: nextRatchet,
      increasedBy: currentSeek.increasedBy + combinedCounter(nextRatchet) - combinedCounter(currentSeek.ratchet)
    }
  } while (await step(currentSeek))

  return seekBefore
}

export async function compare(left: SpiralRatchet, right: SpiralRatchet, maxSteps: number): Promise<number | "unknown"> {
  const leftLargeInitial = new Uint8Array(left.large)
  const rightLargeInitial = new Uint8Array(right.large)

  const leftCounter = combinedCounter(left)
  const rightCounter = combinedCounter(right)

  if (uint8arrays.equals(leftLargeInitial, rightLargeInitial)) {
    if (leftCounter === rightCounter) {
      return 0
    }
    return leftCounter - rightCounter
  }

  // here, the large digit always differs. So one of the ratchets will always be bigger,
  // they can't be equal.
  // We can find out which one is bigger by hashing both at the same time and looking at
  // when one created the same digit as the other, essentially racing the large digit's
  // recursive hashes.

  let leftLarge = left.large
  let leftLargeCounter = 0
  let rightLarge = right.large
  let rightLargeCounter = 0

  // Since the two ratchets might just be generated from a totally different setup, we
  // can never _really_ know which one is the bigger one. They might be unrelated.

  while (maxSteps--) {
    leftLarge = await sha(leftLarge)
    rightLarge = await sha(rightLarge)
    leftLargeCounter++
    rightLargeCounter++

    // largerCountAhead is how many `inc`s the larger one is head of the smaller one
    if (uint8arrays.equals(new Uint8Array(rightLarge), leftLargeInitial)) {
      // rightLargeCounter * 256*256 is the count of `inc`s applied via advancing the large digit continually
      // -rightCounter is the difference between `right` and its next large epoch.
      // leftCounter is just what's left to add because of the count at which `left` is.
      const largerCountAhead = rightLargeCounter * 256 * 256 - rightCounter + leftCounter
      return largerCountAhead
    }

    if (uint8arrays.equals(new Uint8Array(leftLarge), rightLargeInitial)) {
      // In this case, we compute the same difference, but return the negative to indicate
      // that `right` is bigger than `left` rather than the other way around.
      const largerCountAhead = leftLargeCounter * 256 * 256 - leftCounter + rightCounter
      return -largerCountAhead
    }
  }

  return "unknown"
}

export function equal(left: SpiralRatchet, right: SpiralRatchet): boolean {
  return equalLarge(left, right) && equalMedium(left, right) && equalSmall(left, right)
}

export function equalLarge(left: SpiralRatchet, right: SpiralRatchet): boolean {
  return uint8arrays.equals(new Uint8Array(left.large), new Uint8Array(right.large))
}

export function equalMedium(left: SpiralRatchet, right: SpiralRatchet): boolean {
  return left.mediumCounter === right.mediumCounter && uint8arrays.equals(new Uint8Array(left.medium), new Uint8Array(right.medium))
}

export function equalSmall(left: SpiralRatchet, right: SpiralRatchet): boolean {
  return left.smallCounter === right.smallCounter && uint8arrays.equals(new Uint8Array(left.small), new Uint8Array(right.small))
}

export async function* previous(recent: SpiralRatchet, old: SpiralRatchet, discrepancyBudget: number): AsyncGenerator<SpiralRatchet, void, unknown> {
  if (equal(recent, old)) return
  try {
    yield* previousHelper(recent, old, discrepancyBudget)
  } catch (e) {
    if (e === "used up discrepancy budget") {
      throw new Error(`Couldn't generate previous rachets. Recent ratchet is more than ${discrepancyBudget} increments above old, or recent is older than old or they're unrelated.`)
    }
  }
}

/**
 * The best way to explain this algorithm is with a simpler form of it, using 3-digit numbers instead of ratchets:
 *
 *   function* previous(end, start) {
 *       if (start >= end) {
 *           throw ["invalid input", end, start]
 *       }
 *       const endL = (end / 100) | 0
 *       const startL = (start / 100) | 0
 *       const startLPlus = (startL + 1) * 100
 *  
 *       if (endL === startL || end === startLPlus) {
 *           const endM = (end / 10) | 0
 *           const startM = (start / 10) | 0
 *           const startMPlus = (startM + 1) * 10
 *  
 *           if (endM === startM || end === startMPlus) {
 *               const startPlus = start + 1
 *  
 *               if (end === startPlus) {
 *                   yield start
 *               } else {
 *                   yield* previous(end, startPlus)
 *                   yield* previous(startPlus, start)
 *               }
 *           } else {
 *               yield* previous(end, startMPlus)
 *               yield* previous(startMPlus, start)
 *           }
 *       } else {
 *           yield* previous(end, startLPlus)
 *           yield* previous(startLPlus, start)
 *       }
 *   }
 * 
 * startLPlus transforms a number like 12 into 100, or 133 into 200, similar to what `nextLargeEpoch` does for ratchets.
 * startMPlus transforms a number like 12 into 20, or 133 into 140, similar to what `nextMediumEpoch` does for ratchets.
 * 
 * A naive version of generating the previous values of `old` would be to increment `recent` by one until it
 * becomes equal to `old`, remembering the in-between values and yielding these values in reverse.
 * 
 * This is what this algorithm does when the ratchets are close (i.e. maximum 1 medium epoch apart, a maximum difference of 511).
 * 
 * However, we can do better than that: We can search ahead bigger digits first if we notice that the ratchets are far apart.
 * For example, if the old ratchet is at revision 0, and the new ratchet at revision 256*256*2, and the user is only interested in
 * the previous values between revision 256*256 and 256*256*2, then we skip all of the work of incrementing by skipping
 * the old value to revision 256*256.
 * Thus we can just recurse with `previousHelper(<256*256*2>, <256*256>)`
 * Because the user might request even older revisions, we just recurse with `previousHelper(<256*256>, <0>)`
 * 
 * The same can be done with the medium digit.
 */
async function* previousHelper(recent: SpiralRatchet, old: SpiralRatchet, discrepancyBudget?: number): AsyncGenerator<SpiralRatchet, void, unknown> {
  // If the ratchets are actually unrelated, we need to stop the inifnite recursion
  if (discrepancyBudget != null && discrepancyBudget <= 0) {
    throw "used up discrepancy budget"
  }

  const oldNextLarge = await nextLargeEpoch(old)

  if (equalLarge(recent, old) || equalLarge(recent, oldNextLarge.jumped)) {
    const oldNextMedium = await nextMediumEpoch(old)

    if (equalMedium(recent, old) || equalMedium(recent, oldNextMedium.jumped)) {
      // we break out of the recursive pattern at this point
      // because going through sequentially is faster
      let revision = old
      const revisions: SpiralRatchet[] = []
      while (!equal(revision, recent)) {
        revisions.push(revision)
        revision = await inc(revision)
      }
      for (const revision of revisions.reverse()) {
        yield revision
      }
    } else {
      yield* previousHelper(recent, oldNextMedium.jumped, discrepancyBudget == null ? undefined : discrepancyBudget - oldNextMedium.stepsDone)
      yield* previousHelper(oldNextMedium.jumped, old)
    }
  } else {
    yield* previousHelper(recent, oldNextLarge.jumped, discrepancyBudget == null ? undefined : discrepancyBudget - oldNextLarge.stepsDone)
    yield* previousHelper(oldNextLarge.jumped, old)
  }
}

export async function nextN(spiral: SpiralRatchet, n: number): Promise<SpiralRatchet[]> {
  const ratchets: SpiralRatchet[] = []
  let workingRatchet = spiral
  for (let i = 0; i < n; i++) {
    workingRatchet = await inc(workingRatchet)
    ratchets.push(workingRatchet)
  }
  return ratchets
}

//--------------------------------------
// Serialization
//--------------------------------------


export function toCborForm(ratchet: SpiralRatchet): CborForm {
  return {
    large: new Uint8Array(ratchet.large),
    medium: new Uint8Array(ratchet.medium),
    mediumCounter: ratchet.mediumCounter,
    small: new Uint8Array(ratchet.small),
    smallCounter: ratchet.smallCounter
  }
}

export function fromCborForm(cbor: unknown): SpiralRatchet {
  const error = () => new Error(`Can't deserialize spiralratchet from cbor: ${JSON.stringify(cbor)}`)
  if (cbor == null || typeof cbor !== "object") throw error()
  if (!hasProp(cbor, "large") || !(cbor.large instanceof Uint8Array)) throw error()
  if (!hasProp(cbor, "medium") || !(cbor.medium instanceof Uint8Array)) throw error()
  if (!hasProp(cbor, "small") || !(cbor.small instanceof Uint8Array)) throw error()
  if (!hasProp(cbor, "mediumCounter") || typeof cbor.mediumCounter !== "number") throw error()
  if (!hasProp(cbor, "smallCounter") || typeof cbor.smallCounter !== "number") throw error()
  return {
    large: cbor.large.buffer,
    medium: cbor.medium.buffer,
    mediumCounter: cbor.mediumCounter,
    small: cbor.small.buffer,
    smallCounter: cbor.smallCounter
  }
}



//--------------------------------------
// Private ㊙️
//--------------------------------------


async function incBySmall(ratchet: SpiralRatchet, n: number): Promise<SpiralRatchet> {
  const small = await shaN(ratchet.small, n)
  return Object.freeze({
    ...ratchet,
    small,
    smallCounter: ratchet.smallCounter + n
  })
}

async function sha(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  return await webcrypto.digest("sha-256", buffer)
}

async function shaN(buffer: ArrayBuffer, n: number): Promise<ArrayBuffer> {
  for (let i = 0; i < n; i++) {
    buffer = await webcrypto.digest("sha-256", buffer)
  }
  return buffer
}

function combinedCounter(ratchet: SpiralRatchet): number {
  return 256 * ratchet.mediumCounter + ratchet.smallCounter
}

function complement(array: ArrayBuffer): ArrayBuffer {
  return new Uint8Array(array).map(n => n ^ 0xFF).buffer
}

function xor(l: ArrayBuffer, r: ArrayBuffer): ArrayBuffer {
  if (l.byteLength != r.byteLength) throw new Error("Can't xor two array buffers with different lengths")
  const rBytes = new Uint8Array(r)
  return new Uint8Array(l).map((value, i) => value ^ rBytes[i])
}
