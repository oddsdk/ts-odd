import { checkFprsTill } from "./lib.js"
import * as bloom from "../bloomfilter.js"
import drain from "it-drain"

const count = 1_000_000_000
const workers = 16
const params = bloom.wnfsParameters
// const params = { mBytes: 85, kHashes: 10 }
await drain(checkFprsTill([
  57,
  52,
  47,
  42,
  37,
  32,
  27,
  25,
  23,
  21,
  19,
  17
], count / workers, workers, params))
