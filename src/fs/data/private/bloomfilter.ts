export type BloomFilter = Uint8Array

export interface BloomParameters {
  mBytes: number
  kHashes: number
}

export const wnfsParameters: BloomParameters = {
  mBytes: 256, // 2048 bits / 8 bits per byte = 256 bytes
  kHashes: 30,
}

export function empty(parameters: BloomParameters): BloomFilter {
  return new Uint8Array(Array.from(new Array(parameters.mBytes)))
}

export function has(hash: ArrayBuffer, filter: BloomFilter, parameters: BloomParameters): boolean {
  for (const index of indicesFromHash(hash, parameters)) {
    if (!getBit(filter, index)) return false
  }
  return true
}

export function add(hash: ArrayBuffer, filter: BloomFilter, parameters: BloomParameters): void {
  for (const index of indicesFromHash(hash, parameters)) {
    setBit(filter, index)
  }
}

function setBit(filter: BloomFilter, bitIndex: number): void {
  const byteIndex = (bitIndex / 8) | 0
  const indexWithinByte = bitIndex % 8
  filter[byteIndex] = filter[byteIndex] | (1 << indexWithinByte)
}

function getBit(filter: BloomFilter, bitIndex: number): boolean {
  const byteIndex = (bitIndex / 8) | 0
  const indexWithinByte = bitIndex % 8
  return (filter[byteIndex] & (1 << indexWithinByte)) !== 0
}

function indicesFromHash(hash: ArrayBuffer, parameters: BloomParameters): Generator<number, void, unknown> {
  const view = new DataView(hash)
  return enhancedDoubleHash(
    view.getUint32(0, true), // little endian
    view.getUint32(4, true), // little endian
    parameters.mBytes * 8, // bytes to bits
    parameters.kHashes
  )
}

/** 
 * https://www.ccs.neu.edu/home/pete/pub/bloom-filters-verification.pdf
 * Section 5.2 "Algorithm 2"
 * A.k.a. the "enhanced double hash".
 * 
 * Will take two hashes `a` and `b` (expected ~32bit) and produce `amount` many hashes modulo `modulo`.
 * 
 * These are the indices for a given element in the bloom filter
 */
function* enhancedDoubleHash(a: number, b: number, modulo: number, amount: number): Generator<number, void, unknown> {
  let x = a % modulo
  let y = b & modulo
  yield x
  for (let i = 1; i < amount; i++) {
    x = (x + y) % modulo
    y = (y + i) % modulo
    yield x
  }
  return
}
