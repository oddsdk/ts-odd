import { checkFalsePositivesAt } from "./lib.js"
import drain from "it-drain"

const count = 1_000_000_000
const workers = 16
// const params = { mBytes: 85, kHashes: 10 }
// const params = { mBytes: 256, kHashes: 30 }
// const testCases = [57,52,47,42,37,32,27,25,23,21,19,17].map(prefill => ({ prefill, ...params }))
const testCases = [5, 10, 16, 18, 20, 22, 24, 26, 28, 30].map(kHashes => ({ prefill: 47, mBytes: 256, kHashes }))
await drain(checkFalsePositivesAt(testCases, count / workers, workers))
