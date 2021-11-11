import * as xxhash from "js-xxhash"

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
  if (parameters.mBytes <= 0 || parameters.mBytes > 2**16/8) {
    throw new Error(`Unsupported bloom filter parameter size: ${parameters.mBytes * 8} bits. Needs to be > 0 and < ${2**16}`)
  }
  return new Uint8Array(Array.from(new Array(parameters.mBytes)))
}

export function has(element: Uint8Array, filter: BloomFilter, parameters: BloomParameters): boolean {
  for (const index of indicesFor(element, parameters)) {
    if (!getBit(filter, index)) return false
  }
  return true
}

export function add(element: Uint8Array, filter: BloomFilter, parameters: BloomParameters): void {
  for (const index of indicesFor(element, parameters)) {
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

function* indicesFor(element: Uint8Array, parameters: BloomParameters): Generator<number, void, unknown> {
  const m = parameters.mBytes * 8

  for (let i = 0; i < parameters.kHashes; i++) {
    yield xxhash.xxHash32(element, i) % m
  }
}

const bitcount = (n: number) => n.toString(2).replace(/0/g, "").length
const LUT = Array.from(new Array(256)).map((_, i) => bitcount(i))

export function countOnes(filter: BloomFilter): number {
  let count = 0
  for (const byte of filter) {
    count += LUT[byte] // 0 <= byte <= 255
  }
  return count
}
