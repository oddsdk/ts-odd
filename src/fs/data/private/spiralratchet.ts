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
    return await nextMediumEpoch(ratchet)
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
    const jumped = await nextLargeEpoch(ratchet)
    const stepsDone = 256 * 256 - combinedCounter(ratchet) // steps to the next large epoch
    return await incBy(jumped, n - stepsDone)
  }
  if (n >= 256 - ratchet.smallCounter) { // i.e. there *will* be a medium epoch jump if we used `inc`s
    const jumped = await nextMediumEpoch(ratchet)
    const stepsDone = combinedCounter(jumped) - combinedCounter(ratchet)
    return await incBy(jumped, n - stepsDone)
  }
  return await incBySmall(ratchet, n)
}

export async function nextMediumEpoch(ratchet: SpiralRatchet): Promise<SpiralRatchet> {
  if (ratchet.mediumCounter >= 255) {
    return await nextLargeEpoch(ratchet)
  }

  return {
    ...ratchet,

    medium: await sha(ratchet.medium), // NOTE: this uses the input ratchet
    mediumCounter: ratchet.mediumCounter + 1,

    small: await sha(complement(ratchet.medium)), // NOTE: this uses the input ratchet
    smallCounter: 0
  }
}

export async function nextLargeEpoch(ratchet: SpiralRatchet): Promise<SpiralRatchet> {
  return await zero({ seed: ratchet.large })
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
  // TODO: Incorporate seek randomness. I.e. add some offsets here and such that the seek isn't completely predictable by an attacker.
  let seekState = { ratchet, increasedBy: 0 }
  seekState = await seekLarge(seekState.ratchet, step)
  seekState = await seekSubLarge(seekState, nextMediumEpoch, step)
  return await seekSubLarge(seekState, inc, step)
}

export async function seekLarge(ratchet: SpiralRatchet, step: (seek: SpiralSeek) => Promise<boolean>): Promise<SpiralSeek> {
  let currentSeek = { ratchet, increasedBy: 0 }
  let seekBefore = currentSeek

  do {
    seekBefore = currentSeek
    currentSeek = {
      ratchet: await nextLargeEpoch(currentSeek.ratchet),
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

export async function* previous(recent: SpiralRatchet, old: SpiralRatchet): AsyncGenerator<SpiralRatchet, void, unknown> {
  const oldNextLarge = await nextLargeEpoch(old)

  if (equalLarge(recent, old) || equalLarge(recent, oldNextLarge)) {
    const oldNextMedium = await nextMediumEpoch(old)

    if (equalMedium(recent, old) || equalMedium(recent, oldNextMedium)) {
      const oldNextSmall = await inc(old)

      if (equal(recent, oldNextSmall)) {
        yield old
      } else {
        yield* previous(recent, oldNextSmall)
        yield* previous(oldNextSmall, old)
      }
    } else {
      yield* previous(recent, oldNextMedium)
      yield* previous(oldNextMedium, old)
    }
  } else {
    yield* previous(recent, oldNextLarge)
    yield* previous(oldNextLarge, old)
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
