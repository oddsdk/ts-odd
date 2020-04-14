import cbor from 'borc'
import { CID, FileContent } from './types'
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

export const getBool = async (cid: CID, key?: string): Promise<boolean | undefined> => {
  const bool = await catAndDecode(cid, key)
  return typeof bool === 'boolean' ? bool : undefined
}

export const getInt = async (cid: CID, key?: string): Promise<number | undefined> => {
  const int = parseInt(await catAndDecode(cid, key))
  return typeof int === 'number' ? int : undefined
}

export const getString = async (cid: CID, key?: string): Promise<string | undefined> => {
  const str = await catAndDecode(cid, key)
  return typeof str === 'string' ? str : undefined
}

export const getFile = async (cid: CID, key?: string): Promise<FileContent> => {
  return catAndDecode(cid, key)
}

export default {
  add,
  catAndDecode,
  getBool,
  getInt,
  getString,
  getFile,
}
