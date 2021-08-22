import xxhash from "xxhashjs"

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

export function has(element: ArrayBuffer, filter: BloomFilter, parameters: BloomParameters): boolean {
  for (const index of indicesFor(element, parameters)) {
    if (!getBit(filter, index)) return false
  }
  return true
}

export function add(element: ArrayBuffer, filter: BloomFilter, parameters: BloomParameters): void {
  for (const index of indicesFor(element, parameters)) {
    setBit(filter, index)
  }
}

const bitcount = (n: number) => n.toString(2).replace(/0/g,"").length
const LUT = Array.from(new Array(256)).map((_, i) => bitcount(i))

export function countBits(filter: BloomFilter): number {
  let count = 0
  for (const byte of filter) {
    count += LUT[byte] // 0 <= byte <= 255
  }
  return count
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

function* indicesFor(element: ArrayBuffer, parameters: BloomParameters): Generator<number, void, unknown> {
  for (let i = 0; i < parameters.kHashes; i++) {
    yield xxhash.h32(i).update(element).digest().toNumber() % (parameters.mBytes * 8)
  }
}
