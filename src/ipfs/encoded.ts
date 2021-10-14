import * as cbor from "cborg"
import { SymmAlg } from "keystore-idb/lib/types.js"

import { isBlob } from "../common/type-checks.js"
import * as blob from "../common/blob.js"
import * as crypto from "../crypto/index.js"

// IPFS

import { CID, FileContent, AddResult } from "./types.js"
import * as basic from "./basic.js"


export const add = async (content: FileContent, options?: { key: string; alg: SymmAlg }): Promise<AddResult> => {
  // can't cbor encode blobs ie file streams
  const normalized = isBlob(content) ? await blob.toUint8Array(content) : content
  const encoded = cbor.encode(normalized)
  const toAdd = options != null ? await crypto.aes.encrypt(encoded, options.key, options.alg) : encoded
  return basic.add(toAdd)
}

export const catAndDecode = async (cid: CID, options?: { key: string; alg: SymmAlg }): Promise<unknown> => {
  const buf = await basic.catBuf(cid)
  const toDecode = options != null ? await crypto.aes.decrypt(buf, options.key, options.alg) : buf
  try {
    return cbor.decode(toDecode)
  } catch (e) {
    console.error(`Couldn't make sense of data. Encryption?`, options)
    throw e
  }
}
