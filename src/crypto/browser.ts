import tweetnacl from "tweetnacl"
import rsaOperations from "keystore-idb/lib/rsa/index.js"
import utils from "keystore-idb/lib/utils.js"
import aes from "keystore-idb/lib/aes/index.js"
import { CharSize, SymmAlg, SymmKeyLength } from "keystore-idb/lib/types.js"

import { assertBrowser } from "../common/browser.js"
import * as keystore from "../keystore.js"


export const encrypt = async (data: Uint8Array, keyStr: string, alg: SymmAlg): Promise<Uint8Array> => {
  assertBrowser("aes.encrypt")
  const key = await aes.importKey(keyStr, { length: SymmKeyLength.B256, alg })
  const encrypted = await aes.encryptBytes(data.buffer, key, { alg })
  return new Uint8Array(encrypted)
}

export const decrypt = async (encrypted: Uint8Array, keyStr: string, alg: SymmAlg): Promise<Uint8Array> => {
  assertBrowser("aes.decrypt")
  const key = await aes.importKey(keyStr, { length: SymmKeyLength.B256, alg })
  const decryptedBuf = await aes.decryptBytes(encrypted.buffer, key, { alg })
  return new Uint8Array(decryptedBuf)
}

export const genKeyStr = async (alg: SymmAlg): Promise<string> => {
  assertBrowser("aes.genKeyStr")
  const key = await aes.makeKey({ length: SymmKeyLength.B256, alg })
  return aes.exportKey(key)
}

export const decryptGCM = async (encrypted: string, keyStr: string, ivStr: string): Promise<string> => {
  assertBrowser("aes.decryptGCM")
  const iv = utils.base64ToArrBuf(ivStr)
  const sessionKey = await crypto.subtle.importKey(
    "raw",
    utils.base64ToArrBuf(keyStr),
    "AES-GCM",
    false,
    [ "encrypt", "decrypt" ]
  )

  // Decrypt secrets
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    sessionKey,
    utils.base64ToArrBuf(encrypted)
  )
  return utils.arrBufToStr(decrypted, CharSize.B8)
}

export const sha256 = async (bytes: Uint8Array): Promise<Uint8Array> => {
  assertBrowser("hash.sha256")
  const buf = bytes.buffer
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return new Uint8Array(hash)
}

export const rsaVerify = (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> => {
  assertBrowser("rsa.verify")
  const keyStr = utils.arrBufToBase64(publicKey.buffer)
  return rsaOperations.verify(message, signature, keyStr)
}

export const ed25519Verify = (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> => {
  return new Promise(resolve => resolve(tweetnacl.sign.detached.verify(message, signature, publicKey)))
}

export const ksPublicExchangeKey = async (): Promise<string> => {
  assertBrowser("keystore.publicExchangeKey")
  const ks = await keystore.get()
  return ks.publicExchangeKey()
}

export const ksPublicWriteKey = async (): Promise<string> => {
  assertBrowser("keystore.publicWriteKey")
  const ks = await keystore.get()
  return ks.publicWriteKey()
}

export const ksDecrypt = async (encrypted: string): Promise<string> => {
  assertBrowser("keystore.decrypt")
  const ks = await keystore.get()
  return ks.decrypt(encrypted)
}

export const ksSign = async (message: string, charSize: number): Promise<string> => {
  assertBrowser("keystore.sign")
  const ks = await keystore.get()
  return ks.sign(message, { charSize })
}

export const ksImportSymmKey = async (key: string, name: string): Promise<void> => {
  assertBrowser("keystore.importSymmKey")
  const ks = await keystore.get()
  return ks.importSymmKey(key, name)
}

export const ksExportSymmKey = async (name: string): Promise<string> => {
  assertBrowser("keystore.exportSymmKey")
  const ks = await keystore.get()
  return ks.exportSymmKey(name)
}

export const ksKeyExists = async (name:string): Promise<boolean> => {
  assertBrowser("keystore.keyExists")
  const ks = await keystore.get()
  return ks.keyExists(name)
}

export const ksGetAlg = async (): Promise<string> => {
  assertBrowser("keystore.getAlg")
  const ks = await keystore.get()
  return ks.cfg.type
}

export const ksClear = async (): Promise<void> => {
  assertBrowser("keystore.clear")
  return keystore.clear()
}
