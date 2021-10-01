import * as cbor from "cborg"
import { SymmAlg } from "keystore-idb/lib/types.js"

import { isBlob, isJust } from "../common/type-checks.js"
import { Maybe } from "../common/types.js"
import * as blob from "../common/blob.js"
import * as crypto from "../crypto/index.js"

// IPFS

import { CID, FileContent, AddResult } from "./types.js"
import * as basic from "./basic.js"


export const add = async (content: FileContent, key: Maybe<string>, alg: Maybe<SymmAlg>): Promise<AddResult> => {
  // can't cbor encode blobs ie file streams
  const normalized = isBlob(content) ? await blob.toUint8Array(content) : content
  const encoded = cbor.encode(normalized)
  const toAdd = isJust(key) ? await crypto.aes.encrypt(encoded, key, alg || SymmAlg.AES_CTR) : encoded
  return basic.add(toAdd)
}

export const catAndDecode = async (cid: CID, key: Maybe<string>, alg: Maybe<SymmAlg>): Promise<unknown> => {
  const buf = await basic.catBuf(cid)
  const toDecode = isJust(key) ? await crypto.aes.decrypt(buf, key, alg || SymmAlg.AES_CTR) : buf
  return cbor.decode(toDecode)
}
