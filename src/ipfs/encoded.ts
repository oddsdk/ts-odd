import * as cbor from "cborg"

import { SymmAlg } from "keystore-idb/lib/types.js"

import { isBlob, isDefined, isJust, isString } from "../common/type-checks.js"
import { Maybe } from "../common/types.js"
import * as blob from "../common/blob.js"
import * as crypto from "../crypto/index.js"

// IPFS

import { CID, FileContent, AddResult } from "./types.js"
import * as basic from "./basic.js"


export const add = async (content: FileContent, key: Maybe<string>): Promise<AddResult> => {
  // can't cbor encode blobs ie file streams
  const normalized = isBlob(content) ? await blob.toUint8Array(content) : content
  const encoded = cbor.encode(normalized)
  
  if (!isJust(key)) {
    return basic.add(encoded)
  }
  
  const alg = SymmAlg.AES_GCM
  const cip = await crypto.aes.encrypt(encoded, key, alg)
  const toAdd = cbor.encode({ alg, cip })
  return basic.add(toAdd)
}

export const catAndDecode = async (cid: CID, key: Maybe<string>): Promise<unknown> => {
  const buf = await basic.catBuf(cid)
  
  if (!isJust(key)) {
    return cbor.decode(buf)
  }

  const withAlgorithm = cbor.decode(buf)
  if (!isSymmAlg(withAlgorithm.alg) || !isDefined(withAlgorithm.cip)) {
    throw new Error(`Unexpected private block. Expected "alg" and "cip" field.`)
  }
  const alg = withAlgorithm.alg
  const toDecode = await crypto.aes.decrypt(withAlgorithm.cip, key, alg)
  return cbor.decode(toDecode)
}

function isSymmAlg(alg: unknown): alg is SymmAlg {
  return isString(alg) && (Object.values(SymmAlg) as string[]).includes(alg)
}
