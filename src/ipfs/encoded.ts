import cbor from 'borc'
import { CID } from './types'
import { catBuf } from './basic'

export const catAndDecode = async (cid: CID): Promise<any> => {
  const buf = await catBuf(cid)
  return cbor.decode(buf)
}

export const getBool = async (cid: CID): Promise<boolean | undefined> => {
  const bool = await catAndDecode(cid)
  return typeof bool === 'boolean' ? bool : undefined
}

export const getInt = async (cid: CID): Promise<number | undefined> => {
  const int = await catAndDecode(cid)
  return typeof int === 'number' ? int : undefined
}

export const getString = async (cid: CID): Promise<string | undefined> => {
  const str = await catAndDecode(cid)
  return typeof str === 'string' ? str : undefined
}

export default {
  catAndDecode,
  getBool,
  getInt,
  getString,
}
