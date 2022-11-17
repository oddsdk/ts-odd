import { arrbufs } from "../common/index.js"


export const BASE58_DID_PREFIX = "did:key:z"


/**
 * Determines if an ArrayBuffer has a given indeterminate length-prefix.
 */
export const hasPrefix = (prefixedKey: ArrayBuffer, prefix: ArrayBuffer): boolean => {
  return arrbufs.equal(prefix, prefixedKey.slice(0, prefix.byteLength))
}
