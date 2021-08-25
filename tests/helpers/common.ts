import CID from "cids"
import * as uint8arrays from "uint8arrays"

export function isCI(): boolean {
  return process.env.TEST_ENV === "gh-action"
}

export function canonicalize(object: unknown): unknown {
  return JSON.parse(JSON.stringify(object, (_, value) => {
    // It's much nicer to compare cids as strings in tests
    if (value && value.version && value.codec && value.hash) {
      return new CID(value.version, value.codec, value.hash).toString()
    }
    // LazyCIDRefs support toObject, making comparisons possible
    if (value && value.toObject) {
      return value.toObject()
    }
    // ArrayBuffers stringify to "{}". This kills tests that compares anything with ArrayBuffers in it.
    if (value instanceof ArrayBuffer) {
      return uint8arrays.toString(new Uint8Array(value), "base64url")
    }
    return value
  }))
}
