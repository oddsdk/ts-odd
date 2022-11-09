import { CID } from "multiformats/cid"
import { decode as decodeMultihash } from "multiformats/hashes/digest"
import { hasProp, isNum, isObject } from "./type-checks.js"


/**
 * CID representing an empty string. We use this to speed up DNS propagation
 * However, we treat that as a null value in the code
 */
export const EMPTY_CID = "Qmc5m94Gu7z62RC8waSKkZUrCCBJPyHbkpmGzEePxy2oXJ"

/**
 * Decode a possibly string-encoded CID.
 * Passing an already decoded CID instance works too.
 * @throws Throws an error if a CID cannot be decoded!
 */
export function decodeCID(val: CID | object | string): CID {
  const cid = CID.asCID(val)
  if (cid) return cid

  if (typeof val === "string") return CID.parse(val)
  if (typeof val === "object" && "version" in val && "code" in val && "multihash" in val) {
    return CID.create(val.version, val.code, val.multihash)
  }

  // Result of CID.toJSON()
  if (typeof val === "object" && hasProp(val, "version") && val.version === 1 && hasProp(val, "code") && isNum(val.code) && hasProp(val, "hash") && isObject(val.hash) && Object.values(val.hash).every(isNum)) {
    const multihash = decodeMultihash(new Uint8Array(
      Object.values(val.hash) as number[]
    ))

    return CID.create(val.version, val.code, multihash)
  }

  throw new Error(`Could not decode CID: ${JSON.stringify(val)}`)
}

/**
 * Encode a CID as a string.
 */
export function encodeCID(cid: CID | string): string {
  return typeof cid === "string" ? cid : cid.toString()
}
