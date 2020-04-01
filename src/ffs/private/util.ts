import cbor from 'borc'
import aes from 'keystore-idb/aes'
import { PrivateTreeData } from '../types'
import { FileContent } from '../../ipfs'

export async function genKeyStr(): Promise<string> {
  const key = await aes.makeKey()
  return aes.exportKey(key)
}

export async function emptyDir(): Promise<PrivateTreeData> {
  const key = await genKeyStr()
  return {
    key: key,
    links: []
  }
}

export async function encrypt(data: Uint8Array, keyStr: string): Promise<Uint8Array> {
  const key = await aes.importKey(keyStr)
  const encrypted = await aes.encryptBytes(data.buffer, key)
  return new Uint8Array(encrypted)
}

export async function encryptNode(node: PrivateTreeData, keyStr: string): Promise<Uint8Array> {
  const encoded = cbor.encode(node)
  return encrypt(encoded, keyStr)
}

export async function encryptContent(content: FileContent, keyStr: string): Promise<Uint8Array> {
  const encoded = cbor.encode(content)
  return encrypt(encoded, keyStr)
}

export async function decrypt(encrypted: Uint8Array, keyStr: string): Promise<Uint8Array> {
  const key = await aes.importKey(keyStr)
  const decryptedBuf = await aes.decryptBytes(encrypted.buffer, key)
  return new Uint8Array(decryptedBuf)
}

export async function decryptNode(encrypted: Uint8Array, keyStr: string): Promise<PrivateTreeData> {
  const decrypted = await decrypt(encrypted, keyStr)
  return cbor.decode(decrypted)
}

export async function decryptContent(encrypted: Uint8Array, keyStr: string): Promise<FileContent> {
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
