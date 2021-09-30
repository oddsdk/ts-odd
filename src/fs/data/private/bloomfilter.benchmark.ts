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
    bloom.add(new TextEncoder().encode(str), filter, bloom.wnfsParameters)
    return filter
  },
  has(str, filter) {
    return bloom.has(new TextEncoder().encode(str), filter, bloom.wnfsParameters)
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

export function falsePositiveRate<T>(toAdd: string[], notToAdd: string[], impl: BloomFilterImpl<T>): number[] {
  let filter = impl.create()
  const falsePositiveRates: number[] = []
  for (const elem of toAdd) {
    filter = impl.add(elem, filter)
    const falsePositiveCount = notToAdd.filter(str => impl.has(str, filter)).length
    falsePositiveRates.push(falsePositiveCount / notToAdd.length)
  }
  return falsePositiveRates
}

function randomString(): fc.Arbitrary<string> {
  return fc.string({ minLength: 10, maxLength: 10 })
}

export function randomStrings(amount: number): fc.Arbitrary<string[]> {
  return fc.array(randomString(), { minLength: amount, maxLength: amount })
}

export function randomDisjointStringSets(amount: number, notToAddAmount: number): fc.Arbitrary<{ toAdd: string[]; notToAdd: string[] }> {
  return randomStrings(amount)
    .chain(toAdd => randomStrings(notToAddAmount)
      .filter(notToAdd => !notToAdd.find(str => toAdd.includes(str)))
      .map(notToAdd => ({ toAdd, notToAdd }))
    )
}


// tested parameters:
// falsePositiveRateCheck(50, 1000000) (~10min)
// falsePositiveRateCheck(600, 10000) (~1min)
export function falsePositiveRateCheck(amount: number, notToAddAmount: number): void {
  console.log("generating samples")
  const testData = fc.sample(randomDisjointStringSets(amount, notToAddAmount), 10)
  console.log("starting")
  const fprs = testData.map(data => falsePositiveRate(data.toAdd, data.notToAdd, byteArrayBasedImpl))
  for (let i = 0; i < amount; i++) {
    console.log(`${i};${fprs.map(fpr => fpr[i].toFixed(6).replace(".", ",")).join(";")}`)
  }
  console.log("done")
}

export function runBenchmark(amount: number): void {
  console.log("generating samples")
  const testData = fc.sample(randomString(), amount)
  const runBench = () => bloomFilterOps(testData, byteArrayBasedImpl)
  console.log("warming up")
  runBench()
  console.log("starting")
  const before = performance.now()
  runBench()
  console.log("time (ms):", performance.now() - before)
}
