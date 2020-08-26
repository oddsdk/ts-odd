import aes from 'keystore-idb/aes'
import { SymmKeyLength } from 'keystore-idb/types'
import { strToArrBuf } from 'keystore-idb/utils'
import * as keystore from './config'
import * as hex from '../common/hex'


export const getKeyByName = async (keyName: string): Promise<string> => {
  const ks = await keystore.get()
  return ks.exportSymmKey(keyName)
}

export const encrypt = async (data: Uint8Array, keyStr: string): Promise<Uint8Array> => {
  const key = await aes.importKey(keyStr, { length: SymmKeyLength.B256 })
  const encrypted = await aes.encryptBytes(data.buffer, key)
  return new Uint8Array(encrypted)
}

export const decrypt = async (encrypted: Uint8Array, keyStr: string): Promise<Uint8Array> => {
  const key = await aes.importKey(keyStr, { length: SymmKeyLength.B256 })
  const decryptedBuf = await aes.decryptBytes(encrypted.buffer, key)
  return new Uint8Array(decryptedBuf)
}

export const genKeyStr = async (): Promise<string> => {
  const key = await aes.makeKey({ length: SymmKeyLength.B256 })
  return aes.exportKey(key)
}

export const sha256Str = async(str: string): Promise<string> => {
  const buf = strToArrBuf(str, 8)
  const hash = await sha256(buf)
  return hex.fromBuffer(hash)
}

export const sha256 = async (buf: ArrayBuffer): Promise<ArrayBuffer> => {
  return crypto.subtle.digest('SHA-256', buf)
}
