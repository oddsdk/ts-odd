import { performance } from "perf_hooks"
import * as fc from "fast-check"
import * as arrayBloom from "fission-bloom-filters"
import * as bloom from "./bloomfilter.js"
import { webcrypto } from "one-webcrypto"

interface BloomFilterImpl<T> {
  create(): T
  add(str: string, filter: T): T
  has(str: string, filter: T): boolean
}

export const byteArrayBasedImpl: BloomFilterImpl<bloom.BloomFilter> = {
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

export const arrayBasedImpl: BloomFilterImpl<arrayBloom.BloomFilter> = {
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
  console.log("notToAdd.length", notToAdd.length)
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
// falsePositiveRateCheck(600, 10000) (~5min)
export function falsePositiveRateCheck(amount: number, notToAddAmount: number, impl = byteArrayBasedImpl): void {
  console.log("generating samples")
  const testData = fc.sample(randomDisjointStringSets(amount, notToAddAmount), 10)
  console.log("starting")
  const fprs = testData.map(data => falsePositiveRate(data.toAdd, data.notToAdd, impl))
  for (let i = 0; i < amount; i++) {
    console.log(`${i};${fprs.map(fpr => fpr[i].toFixed(6).replace(".", ",")).join(";")}`)
  }
  console.log("done")
}

export function runBenchmark(amount: number, impl = byteArrayBasedImpl): void {
  console.log("generating samples")
  const testData = fc.sample(randomString(), amount)
  const runBench = () => bloomFilterOps(testData, impl)
  console.log("warming up")
  runBench()
  console.log("starting")
  const before = performance.now()
  runBench()
  console.log("time (ms):", performance.now() - before)
}


export function checkFprsTill(prefill: { min?: number; max: number }, count: number, params: bloom.BloomParameters): number[] {
  console.log(`Parameters:`)
  console.log(`m = ${params.mBytes * 8}`)
  console.log(`k = ${params.kHashes}`)
  console.log(`Checking membership of ${count} elements known to not have been added to the bloom filter before.`)
  const prefills = Array.from({ length: (prefill.max - (prefill.min || 0) + 1) }, (_, i) => i + (prefill.min || 1))
  return prefills.map(prefill => {
    const before = performance.now()
    const fpCount = fprAt(prefill, count, params)
    const timeInMs = performance.now() - before
    console.log(`Prefill: \t${prefill} False positive count:\t${fpCount} expected: ${(expectedFPR(prefill, params) * count).toFixed(8)} (${(timeInMs / 1000).toFixed(3)}s)`)
    return fpCount
  })
}

export function expectedFPR(n: number, params: bloom.BloomParameters): number {
  const k = params.kHashes
  const m = params.mBytes * 8
  return Math.pow(1 - Math.exp(-k / (m / n)), k)
}

export function fprAt(prefill: number, count: number, params: bloom.BloomParameters): number {
  const { filter, added } = prepareFilter(prefill, params)
  return countFalsePositives(filter, added, params, count)
}

function prepareFilter(prefill: number, params: bloom.BloomParameters): { filter: bloom.BloomFilter; added: Uint8Array[] } {
  const prefillBytesPerElem = 4
  
  const filter = bloom.empty(params)
  const added = []
  for (let i = 0; i < prefill; i++) {
    const rand = webcrypto.getRandomValues(new Uint8Array(prefillBytesPerElem))
    bloom.add(rand, filter, params)
    added.push(rand)
  }

  return { filter, added }
}

function countFalsePositives(filter: bloom.BloomFilter, added: Uint8Array[], params: bloom.BloomParameters, count: number) {
  const addedInts = added.map(bytes => new DataView(bytes.buffer).getUint32(0)).sort((a, b) => a - b)

  let countRemaining = count
  let falsePositives = 0
  let i = 0
  let addedIntsIndex = 0

  while (countRemaining > 0) {
    if (i === addedInts[addedIntsIndex]) {
      addedIntsIndex++
      continue
    }

    countRemaining--
    const iArr = new Uint8Array(4)
    new DataView(iArr.buffer).setUint32(0, i)
    if (bloom.has(iArr, filter, params)) {
      falsePositives++
    }

    i++
  }
  
  return falsePositives
}
