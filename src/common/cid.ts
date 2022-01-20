import { CID } from "multiformats/cid"


/**
 * Decode a possibly string-encoded CID.
 * Passing an already decoded CID instance works too.
 * NOTE: Throws an error if a CID cannot be decoded!
 */
export function cidFromString(val: CID | object | string): CID {
  const cid = CID.asCID(val)
  if (cid) return cid

  if (typeof val === "string") return CID.parse(val as string)
  if (typeof val === "object" && "version" in val && "code" in val && "multihash" in val) {
    return CID.create(val.version, val.code, val.multihash)
  }

  throw new Error(`Could not decode CID: ${val}`)
}

/**
 * Encode a CID as a string.
 */
export function cidToString(cid: CID | string): string {
  return cid.toString()
}
