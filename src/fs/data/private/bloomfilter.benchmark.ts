import { performance } from "perf_hooks"
import * as fc from "fast-check"
import * as arrayBloom from "fission-bloom-filters"
import * as uint8arrays from "uint8arrays"
import * as bloom from "./bloomfilter.js"

interface BloomFilterImpl<T> {
  create(): T
  add(str: string, filter: T): T
  has(str: string, filter: T): boolean
}

const byteArrayBasedImpl: BloomFilterImpl<bloom.BloomFilter> = {
  create() {
    return bloom.empty(bloom.wnfsParameters)
  },
  add(str, filter) {
    bloom.add(new TextEncoder().encode(str).buffer, filter, bloom.wnfsParameters)
    return filter
  },
  has(str, filter) {
    return bloom.has(new TextEncoder().encode(str).buffer, filter, bloom.wnfsParameters)
  }
}

const arrayBasedImpl: BloomFilterImpl<arrayBloom.BloomFilter> = {
  create() {
    return new arrayBloom.BloomFilter(bloom.wnfsParameters.mBytes * 8, bloom.wnfsParameters.kHashes)
  },
  add(str, filter) {
    filter.add(str)
    return filter
  },
  has(str, filter) {
    return filter.has(str)
  }
}

function bloomFilterOps<T>(elements: string[], impl: BloomFilterImpl<T>): void {
  let filter = impl.create()
  for (const elem of elements) {
    filter = impl.add(elem, filter)
    if (!impl.has(elem, filter)) throw new Error(`Implementation faulty. ${elem} missing from filter after adding`)
  }
  for (const elem of elements) {
    if (!impl.has(elem, filter)) throw new Error(`Implementation faulty. ${elem} missing from filter after adding all`)
  }
}

function bloomFilterCreations<T>(amount: number, exampleElems: string[], impl: BloomFilterImpl<T>): void {
  for (let i = 0; i < amount; i++) {
    const filter = impl.create()
    for (const elem of exampleElems) {
      if (impl.has(elem, filter)) throw new Error(`Implementation faulty. ${elem} should be missing from the filter.`)
    }
  }
}

export function run(amount: number, amountStrings: number): void {
  console.log("generating samples")
  const randomStrings = fc.sample(fc.string(), amountStrings)
  const runByte = () => bloomFilterCreations(amount, randomStrings, byteArrayBasedImpl)
  const runArray = () => bloomFilterCreations(amount, randomStrings, arrayBasedImpl)
  // warmup
  console.log("warming up")
  runArray()
  runByte()
  
  // actual
  console.log("starting")
  const before1 = performance.now()
  runByte()
  console.log("custom impl: ", performance.now() - before1)
  const before2 = performance.now()
  runArray()
  console.log("foreign impl:", performance.now() - before2)
  console.log("done")
}
