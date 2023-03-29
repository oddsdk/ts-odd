import * as Crypto from "../components/crypto/implementation.js"


export type Rng = {
  randomBytes(count: number): Uint8Array
}


export function makeRngInterface(crypto: Crypto.Implementation): Rng {
  return {
    /** Returns random bytes of specified length */
    randomBytes(count: number): Uint8Array {
      return crypto.misc.randomNumbers({ amount: count });
    }
  }
}