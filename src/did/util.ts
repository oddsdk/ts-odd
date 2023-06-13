import * as Uint8Arrays from "uint8arrays"


export const BASE58_DID_PREFIX = "did:key:z"


/**
 * Determines if an Uint8Array has a given indeterminate length-prefix.
 */
export const hasPrefix = (prefixedKey: Uint8Array, prefix: Uint8Array): boolean => {
  return Uint8Arrays.equals(
    prefix,
    prefixedKey.slice(0, prefix.byteLength)
  )
}
