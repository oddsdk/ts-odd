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
  const encoded: Uint8Array = Uint8Array.from(cbor.encode(normalized))
  const toAdd: Uint8Array = isJust(key) ? await crypto.aes.encrypt(encoded, key) : encoded
  return await basic.add(toAdd)
}

export const catAndDecode = async (cid: CID, key: Maybe<string>): Promise<unknown> => {
  const buf = await basic.catBuf(cid)
  const toDecode: Uint8Array = isJust(key) ? await crypto.aes.decrypt(buf, key) : buf
  return cbor.decode(Buffer.from(toDecode))
}
