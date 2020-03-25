import cbor from 'borc'
import aes from 'keystore-idb/aes'
import { PrivateNodeData } from '../types'
import { FileContent } from '../../ipfs'

export function bytesToContent(content: Uint8Array): FileContent {
  return cbor.encode(content)
}

export function contentToBytes(content: FileContent): Uint8Array {
  return cbor.encode(content)
}

export async function genKeyStr(): Promise<string> {
  const key = await aes.makeKey()
  return aes.exportKey(key)
}

export async function emptyDir(): Promise<PrivateNodeData> {
  const key = await genKeyStr()
  return {
    key: key,
    links: []
  }
}

export async function encryptNode(node: PrivateNodeData, keyStr: string): Promise<Uint8Array> {
  const encoded = cbor.encode(node)
  return encrypt(encoded, keyStr)
}

export async function encrypt(data: Uint8Array, keyStr: string): Promise<Uint8Array> {
  const key = await aes.importKey(keyStr)
  const encrypted = await aes.encryptBytes(data.buffer, key)
  return new Uint8Array(encrypted)
}

export async function decrypt(encrypted: Uint8Array, keyStr: string): Promise<Uint8Array> {
  const key = await aes.importKey(keyStr)
  const decryptedBuf = await aes.decryptBytes(encrypted.buffer, key)
  return new Uint8Array(decryptedBuf)
}

export async function decryptNode(encrypted: Uint8Array, keyStr: string): Promise<PrivateNodeData> {
  const decrypted = await decrypt(encrypted, keyStr)
  return cbor.decode(decrypted)
}

export default {
  bytesToContent,
  contentToBytes,
  genKeyStr,
  emptyDir,
  encryptNode,
  encrypt,
  decrypt,
  decryptNode,
}
