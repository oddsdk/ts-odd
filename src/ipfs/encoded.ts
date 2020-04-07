import cbor from 'borc'
import { CID } from './types'
import basic from './basic'
import keystore from '../keystore'

export const add = async (content: any, key?: string): Promise<CID> => {
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
