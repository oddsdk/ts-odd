import { checkFprsTill } from "./lib.js"
import * as bloom from "../bloomfilter.js"
import drain from "it-drain"

const count = 1_000_000_000
const workers = 8
const params = bloom.wnfsParameters
// const params = { mBytes: 85, kHashes: 10 }
await drain(checkFprsTill({ min: 1, max: 47 }, count / workers, workers, params))
