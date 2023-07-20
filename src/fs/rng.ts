import { randomNumbers } from "../common/crypto.js"

export type Rng = {
  randomBytes(count: number): Uint8Array
}

export function makeRngInterface(): Rng {
  return {
    /** Returns random bytes of specified length */
    randomBytes(count: number): Uint8Array {
      return randomNumbers({ amount: count })
    },
  }
}
