import { checkFprsTill } from "./bloomfilter.benchmark.js"
import * as bloom from "./bloomfilter.js"

checkFprsTill({ min: 40, max: 60 }, 1_000_000_000, bloom.wnfsParameters)
