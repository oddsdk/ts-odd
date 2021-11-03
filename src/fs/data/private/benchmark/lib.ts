import { performance } from "perf_hooks"
import * as fc from "fast-check"
import * as arrayBloom from "fission-bloom-filters"
import * as bloom from "../bloomfilter.js"
import { CountFalsePositivesAt } from "./falsepositive.js"
import { spawn, Thread, Worker } from "threads"

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


export async function* checkFprsTill(
  prefill: { min?: number; max: number },
  countPerWorker: number,
  workers: number,
  params: bloom.BloomParameters
): AsyncGenerator<{ prefill: number; timeInMs: number; fpCount: number; bitCounts: number[] }, void> {
  const prefillMin = prefill.min || 1
  const count = countPerWorker * workers
  console.log(`Parameters:`)
  console.log(`m = ${params.mBytes * 8}`)
  console.log(`k = ${params.kHashes}`)
  console.log(`Checking membership of ${count} elements known to not have been added to the bloom filter before.`)
  console.log(`Running with ${workers} workers.`)

  const countFalsePositivesAts = await Promise.all(Array.from({ length: workers }).map(
    () => spawn<CountFalsePositivesAt>(new Worker("./falsepositive.js"))
  ))

  const prefills = Array.from({ length: (prefill.max - prefillMin + 1) }, (_, i) => prefill.max - i)
  for (const prefill of prefills) {
    const before = performance.now()

    const runs = await Promise.all(countFalsePositivesAts.map(run => run(prefill, countPerWorker, params)))
    const fpCount = runs.map(r => r.falsePositiveCount).reduce((a, b) => a + b)
    const bitCounts = runs.map(r => r.bitCount)

    const timeInMs = performance.now() - before
    console.log(`Prefill: \t${prefill} False positive count:\t${fpCount} expected: ${(expectedFPR(prefill, params) * count).toFixed(8)} bitcounts: ${bitCounts} (${(timeInMs / 1000).toFixed(3)}s)`)
    yield { prefill, timeInMs, fpCount, bitCounts }
  }

  for (const thread of countFalsePositivesAts) {
    await Thread.terminate(thread)
  }
}

export function expectedFPR(n: number, params: bloom.BloomParameters): number {
  const k = params.kHashes
  const m = params.mBytes * 8
  return Math.pow(1 - Math.exp(-k / (m / n)), k)
}
