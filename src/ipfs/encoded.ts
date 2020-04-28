import cbor from 'borc'
import { CID, FileContent } from './types'
import basic from './basic'
import keystore from '../keystore'
import { isBlob } from '../common/type-checks'
import blob from '../common/blob'

export const add = async (content: FileContent, key?: string): Promise<CID> => {
  // can't cbor encode blobs ie file streams
  content = isBlob(content) ? await blob.toBuffer(content) : content
  const encoded = cbor.encode(content)
  const toAdd = key !== undefined ? await keystore.encrypt(encoded, key) : encoded
  return basic.add(toAdd)
}

export const catAndDecode = async (cid: CID, key?: string): Promise<any> => {
  const buf = await basic.catBuf(cid)
  const toDecode = key !== undefined ? await keystore.decrypt(buf, key) : buf
  return cbor.decode(toDecode)
}

export default {
  add,
  catAndDecode,
}
