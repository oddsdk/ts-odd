import { strToArrBuf } from "keystore-idb/utils.js"
import * as hex from "../common/hex.js"
import { impl } from "../setup/dependencies.js"

export const sha256Str = async(str: string): Promise<string> => {
  const buf = strToArrBuf(str, 8)
  const arr = new Uint8Array(buf)
  const hash = await impl.hash.sha256(arr)
  return hex.fromBytes(hash)
}

export const hash = {
  sha256: (bytes: Uint8Array): Promise<Uint8Array> =>
    impl.hash.sha256(bytes),
  sha256Str: sha256Str
}
export const aes = {
  encrypt: (bytes: Uint8Array, key: string): Promise<Uint8Array> =>
    impl.aes.encrypt(bytes, key),
  decrypt: (bytes: Uint8Array, key: string): Promise<Uint8Array> =>
    impl.aes.decrypt(bytes, key),
  genKeyStr: (): Promise<string> =>
    impl.aes.genKeyStr(),
  decryptGCM: (encrypted: string, keyStr: string, ivStr: string): Promise<string>  =>
    impl.aes.decryptGCM(encrypted, keyStr, ivStr)
}

export const rsa = {
  verify: (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> =>
    impl.rsa.verify(message, signature, publicKey)
}
export const ed25519 = {
  verify: (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> =>
    impl.ed25519.verify(message, signature, publicKey)
}

export const keystore = {
  publicExchangeKey: (): Promise<string> =>
    impl.keystore.publicExchangeKey(),
  publicWriteKey: (): Promise<string> =>
    impl.keystore.publicWriteKey(),
  decrypt: (encrypted: string): Promise<string> =>
    impl.keystore.decrypt(encrypted),
  sign: (message: string, charSize: number): Promise<string> =>
    impl.keystore.sign(message, charSize),
  importSymmKey: (key: string, name: string): Promise<void> =>
    impl.keystore.importSymmKey(key, name),
  exportSymmKey: (name: string): Promise<string> =>
    impl.keystore.exportSymmKey(name),
  keyExists: (keyName:string): Promise<boolean> =>
    impl.keystore.keyExists(keyName),
  getAlg: (): Promise<string> =>
    impl.keystore.getAlg(),
  clear: (): Promise<void> =>
    impl.keystore.clear()
}
