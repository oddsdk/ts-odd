import cbor from 'borc'
import { CID } from './types'
import { catBuf } from './basic'
import keystore from '../keystore'

export const catAndDecode = async (cid: CID, key?: string): Promise<any> => {
  const buf = await catBuf(cid)
  return key === undefined ? cbor.decode(buf) : keystore.decrypt(buf, key)
}

export const getBool = async (cid: CID, key?: string): Promise<boolean | undefined> => {
  const bool = await catAndDecode(cid)
  return typeof bool === 'boolean' ? bool : undefined
}

export const getInt = async (cid: CID, key?: string): Promise<number | undefined> => {
  const int = parseInt(await catAndDecode(cid))
  return typeof int === 'number' ? int : undefined
}

export const getString = async (cid: CID, key?: string): Promise<string | undefined> => {
  const str = await catAndDecode(cid)
  return typeof str === 'string' ? str : undefined
}

export default {
  catAndDecode,
  getBool,
  getInt,
  getString,
}
