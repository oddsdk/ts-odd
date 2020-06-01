import cbor from 'borc'

import { isBlob, isJust } from '../common/type-checks'
import { Maybe } from '../common/types'
import blob from '../common/blob'
import keystore from '../keystore'

// IPFS

import { CID, FileContent, AddResult } from './types'
import basic from './basic'


export const add = async (content: FileContent, key: Maybe<string>): Promise<AddResult> => {
  // can't cbor encode blobs ie file streams
  content = isBlob(content) ? await blob.toBuffer(content) : content
  const encoded = cbor.encode(content)
  const toAdd = isJust(key) ? await keystore.encrypt(encoded, key) : encoded
  return basic.add(toAdd)
}

export const catAndDecode = async (cid: CID, key: Maybe<string>): Promise<any> => {
  const buf = await basic.catBuf(cid)
  const toDecode = isJust(key) ? await keystore.decrypt(buf, key) : buf
  return cbor.decode(toDecode)
}

export default {
  add,
  catAndDecode,
}
