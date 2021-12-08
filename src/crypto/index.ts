import * as uint8arrays from "uint8arrays"
import { webcrypto } from "one-webcrypto"
import { SymmAlg } from "keystore-idb/lib/types.js"
import { importKey, encryptBytes, decryptBytes, makeKey, exportKey } from "keystore-idb/lib/aes/index.js"
import { SymmKeyLength } from "keystore-idb/lib/types.js"

import { impl } from "../setup/dependencies.js"


export const sha256Str = async(str: string): Promise<string> => {
  const hash = await webcrypto.subtle.digest("sha-256", uint8arrays.fromString(str))
  return uint8arrays.toString(new Uint8Array(hash), "hex")
}


export const hash = {
  sha256: async (bytes: Uint8Array): Promise<Uint8Array> =>
    new Uint8Array(await webcrypto.subtle.digest("sha-256", bytes)),
  sha256Str: sha256Str
}


export const aes = {
  encrypt: async (data: Uint8Array, keyStr: string, alg: SymmAlg): Promise<Uint8Array> => {
    const key = await importKey(keyStr, { length: SymmKeyLength.B256, alg })
    const encrypted = await encryptBytes(data, key, { alg })
    return new Uint8Array(encrypted)
  },
  decrypt: async (encrypted: Uint8Array, keyStr: string, alg: SymmAlg): Promise<Uint8Array> => {
    const key = await importKey(keyStr, { length: SymmKeyLength.B256, alg })
    const decryptedBuf = await decryptBytes(encrypted, key, { alg })
    return new Uint8Array(decryptedBuf)
  },
  genKeyStr: async (alg?: SymmAlg): Promise<string> => {
    const key = await makeKey({ length: SymmKeyLength.B256, alg })
    return exportKey(key)
  },
  decryptGCM: async (encrypted: string, keyStr: string, ivStr: string): Promise<string> => {
    const iv = uint8arrays.fromString(ivStr, "base64pad")
    const sessionKey = await webcrypto.subtle.importKey(
      "raw",
      uint8arrays.fromString(keyStr, "base64pad"),
      "AES-GCM",
      false,
      [ "encrypt", "decrypt" ]
    )

    // Decrypt secrets
    const decrypted = await webcrypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      sessionKey,
      uint8arrays.fromString(encrypted, "base64pad")
    )
    return uint8arrays.toString(new Uint8Array(decrypted))
  }
}


export const rsa = {
  decrypt: (data: Uint8Array, privateKey: CryptoKey) =>
    webcrypto.subtle.decrypt(
      {
        name: "RSA-OAEP"
      },
      privateKey,
      data
    ),
  encrypt: async (message: Uint8Array, keyStr: string) =>
    webcrypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      await webcrypto.subtle.importKey(
        "spki",
        uint8arrays.fromString(keyStr, "base64pad").buffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        [ "encrypt" ]
      ),
      message
    ),
  genKey: () =>
    webcrypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: { name: "SHA-256" }
      },
      true,
      [ "encrypt", "decrypt" ]
    ),
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
