
import * as bloom from "../bloomfilter.js"
import { webcrypto } from "one-webcrypto"
import { expose } from "threads/worker"

export type CountFalsePositivesAt = typeof countFalsePositivesAt

expose(countFalsePositivesAt)

export function countFalsePositivesAt(prefill: number, count: number, params: bloom.BloomParameters): number {
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

function countFalsePositives(
  filter: bloom.BloomFilter,
  added: Uint8Array[],
  params: bloom.BloomParameters,
  count: number
): number {
  const addedInts = added.map(bytes => new DataView(bytes.buffer).getUint32(0)).sort((a, b) => a - b)

  let countRemaining = count
  let falsePositives = 0
  const i = webcrypto.getRandomValues(new Uint8Array(4))
  const iView = new DataView(i.buffer)
  let addedIntsIndex = 0

  while (countRemaining > 0) {
    const iVal = iView.getUint32(0)
    if (iVal === addedInts[addedIntsIndex]) {
      addedIntsIndex++
      continue
    }

    countRemaining--
    if (bloom.has(i, filter, params)) {
      falsePositives++
    }

    iView.setUint32(0, iVal + 1)
  }
  
  return falsePositives
}
