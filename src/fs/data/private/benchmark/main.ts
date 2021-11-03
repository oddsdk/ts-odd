import { checkFprsTill } from "./lib.js"
import * as bloom from "../bloomfilter.js"
import drain from "it-drain"

const count = 1_000_000_000
const workers = 8
await drain(checkFprsTill({ min: 40, max: 60 }, count / workers, workers, bloom.wnfsParameters))
