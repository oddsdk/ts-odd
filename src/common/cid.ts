import { CID } from "multiformats/cid"


/**
 * Decode a possibly string-encoded CID.
 * Passing an already decoded CID instance works too.
 * NOTE: Throws an error if a CID cannot be decoded!
 */
export function cidFromString(possiblyEncoded: CID | string): CID {
  const cid = CID.asCID(possiblyEncoded)
  return cid || CID.parse(possiblyEncoded as string)
}

/**
 * Encode a CID as a string.
 */
export function cidToString(cid: CID | string): string {
  return cid.toString()
}
