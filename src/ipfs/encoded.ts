import cbor from 'borc'
import { CID, FileContent } from './types'
import basic from './basic'
import keystore from '../keystore'
import { blob, isBlob } from '../common'

export const add = async (content: FileContent, key?: string): Promise<CID> => {
  // can't cbor encode blobs ie file streams
  content = isBlob(content) ? blob.toBuffer(content): content
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
