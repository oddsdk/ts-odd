import { strToArrBuf } from 'keystore-idb/utils'
import * as hex from '../common/hex'
import { impl } from '../setup/dependencies'

export const sha256Str = async(str: string): Promise<string> => {
  const buf = strToArrBuf(str, 8)
  const arr = new Uint8Array(buf)
  const hash = await impl.hash.sha256(arr)
  return hex.fromBytes(hash)
}

export const hash = {
  ...impl.hash,
  sha256Str: sha256Str
}

export const aes = impl.aes
export const rsa = impl.rsa
export const ed25519 = impl.ed25519
export const keystore = impl.keystore

