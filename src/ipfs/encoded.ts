import cbor from 'borc'

import { isBlob, isJust } from '../common/type-checks'
import { Maybe } from '../common/types'
import * as blob from '../common/blob'
import * as crypto from '../crypto'

// IPFS

import { CID, FileContent, AddResult } from './types'
import * as basic from './basic'


export const add = async (content: FileContent, key: Maybe<string>): Promise<AddResult> => {
  // can't cbor encode blobs ie file streams
  const normalized = isBlob(content) ? await blob.toBuffer(content) : content
  const encoded = cbor.encode(normalized)
  const toAdd = isJust(key) ? await crypto.aes.encrypt(encoded, key) : encoded
  return basic.add(toAdd)
}

export const catAndDecode = async (cid: CID, key: Maybe<string>): Promise<unknown> => {
  const buf = await basic.catBuf(cid)
  const toDecode = isJust(key) ? await crypto.aes.decrypt(buf, key) : buf
  return cbor.decode(toDecode)
}
