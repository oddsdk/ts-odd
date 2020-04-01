import cbor from 'borc'
import aes from 'keystore-idb/aes'
import { PrivateTreeData } from '../types'
import { FileContent } from '../../ipfs'

export const genKeyStr = async (): Promise<string> => {
  const key = await aes.makeKey()
  return aes.exportKey(key)
}

export const emptyDir = async (): Promise<PrivateTreeData> => {
  const key = await genKeyStr()
  return {
    key: key,
    links: {}
  }
}

export const encrypt = async (data: Uint8Array, keyStr: string): Promise<Uint8Array> => {
  const key = await aes.importKey(keyStr)
  const encrypted = await aes.encryptBytes(data.buffer, key)
  return new Uint8Array(encrypted)
}

export const encryptNode = async (node: PrivateTreeData, keyStr: string): Promise<Uint8Array> => {
  const encoded = cbor.encode(node)
  return encrypt(encoded, keyStr)
}

export const encryptContent = async (content: FileContent, keyStr: string): Promise<Uint8Array> => {
  const encoded = cbor.encode(content)
  return encrypt(encoded, keyStr)
}

export const decrypt = async (encrypted: Uint8Array, keyStr: string): Promise<Uint8Array> => {
  const key = await aes.importKey(keyStr)
  const decryptedBuf = await aes.decryptBytes(encrypted.buffer, key)
  return new Uint8Array(decryptedBuf)
}

export const decryptNode = async (encrypted: Uint8Array, keyStr: string): Promise<PrivateTreeData> => {
  const decrypted = await decrypt(encrypted, keyStr)
  return cbor.decode(decrypted)
}

export const decryptContent = async (encrypted: Uint8Array, keyStr: string): Promise<FileContent> => {
  const decrypted = await decrypt(encrypted, keyStr)
  return cbor.decode(decrypted)
}

export default {
  genKeyStr,
  emptyDir,
  encrypt,
  encryptNode,
  encryptContent,
  decrypt,
  decryptNode,
  decryptContent,
}
