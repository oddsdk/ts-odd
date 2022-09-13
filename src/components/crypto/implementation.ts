import { SymmAlg } from "keystore-idb/types.js"


export { SymmAlg }


export type ImplementationOptions = {
  exchangeKeyName: string
  storeName: string
  writeKeyName: string
}


export type Implementation = {
  aes: {
    decrypt: (encrypted: Uint8Array, key: CryptoKey | Uint8Array, alg: SymmAlg, iv?: Uint8Array) => Promise<Uint8Array>
    encrypt: (data: Uint8Array, key: CryptoKey | Uint8Array, alg: SymmAlg, iv?: Uint8Array) => Promise<Uint8Array>
    exportKey: (key: CryptoKey) => Promise<Uint8Array>
    genKey: (alg: SymmAlg) => Promise<CryptoKey>
  }

  ed25519: {
    verify: (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) => Promise<boolean>
  }

  hash: {
    sha256: (bytes: Uint8Array) => Promise<Uint8Array>
  }

  keystore: {
    clearStore: () => Promise<void>
    decrypt: (encrypted: Uint8Array) => Promise<Uint8Array>
    exportSymmKey: (name: string) => Promise<Uint8Array>
    getAlg: () => Promise<string>
    getUcanAlg: () => Promise<string>
    importSymmKey: (key: Uint8Array, name: string) => Promise<void>
    keyExists: (keyName: string) => Promise<boolean> // TODO: Rename to symmKeyExists
    publicExchangeKey: () => Promise<Uint8Array>
    publicWriteKey: () => Promise<Uint8Array>
    sign: (message: Uint8Array) => Promise<Uint8Array>
  }

  rsa: {
    decrypt: (data: Uint8Array, privateKey: CryptoKey) => Promise<Uint8Array>
    encrypt: (message: Uint8Array, publicKey: CryptoKey) => Promise<Uint8Array>
    genKey: () => Promise<CryptoKeyPair>
    verify: (message: Uint8Array, signature: Uint8Array, publicKey: CryptoKey) => Promise<boolean>
  }
}
