import { SymmAlg } from "keystore-idb/types.js"


export { SymmAlg }


export type ImplementationOptions = {
  exchangeKeyName: string
  storeName: string
  writeKeyName: string
}


export type Implementation = {
  aes: {
    // Related to AES-GCM, this should be able to decrypt both:
    // (a) with the `iv` prefixed in the cipher text (first 16 bytes), and (b) with a given `iv`
    decrypt: (encrypted: Uint8Array, key: CryptoKey | Uint8Array, alg: SymmAlg, iv?: Uint8Array) => Promise<Uint8Array>

    // Related to AES-GCM, this will produce a cipher text with
    // a random `iv` prefixed into it. Unless, you provide the `iv` as a parameter.
    encrypt: (data: Uint8Array, key: CryptoKey | Uint8Array, alg: SymmAlg, iv?: Uint8Array) => Promise<Uint8Array>
    exportKey: (key: CryptoKey) => Promise<Uint8Array>
    genKey: (alg: SymmAlg) => Promise<CryptoKey>
  }

  did: {
    /**
     * Using the key type as the record property name (ie. string = key type)
     *
     * The magic bytes are the `code` found in https://github.com/multiformats/multicodec/blob/master/table.csv
     * encoded as a variable integer (more info about that at https://github.com/multiformats/unsigned-varint).
     *
     * The key type is also found in that table.
     * It's the name of the codec minus the `-pub` suffix.
     *
     * Example
     * -------
     * Ed25519 public key
     * Key type: "ed25519"
     * Magic bytes: [ 0xed, 0x01 ]
     */
    keyTypes: Record<
      string, {
        magicBytes: Uint8Array
        verify: (args: VerifyArgs) => Promise<boolean>
      }
    >
  }

  hash: {
    sha256: (bytes: Uint8Array) => Promise<Uint8Array>
  }

  keystore: {
    clearStore: () => Promise<void>
    decrypt: (encrypted: Uint8Array) => Promise<Uint8Array>
    exportSymmKey: (name: string) => Promise<Uint8Array>
    getAlgorithm: () => Promise<string> // This goes hand in hand with the DID keyTypes record
    getUcanAlgorithm: () => Promise<string>
    importSymmKey: (key: Uint8Array, name: string) => Promise<void>
    keyExists: (keyName: string) => Promise<boolean>
    publicExchangeKey: () => Promise<Uint8Array>
    publicWriteKey: () => Promise<Uint8Array>
    sign: (message: Uint8Array) => Promise<Uint8Array>
  }

  misc: {
    randomNumbers: (options: { amount: number }) => Uint8Array
  }

  rsa: {
    // Used for exchange keys only
    decrypt: (data: Uint8Array, privateKey: CryptoKey | Uint8Array) => Promise<Uint8Array>
    encrypt: (message: Uint8Array, publicKey: CryptoKey | Uint8Array) => Promise<Uint8Array>
    exportPublicKey: (key: CryptoKey) => Promise<Uint8Array>
    genKey: () => Promise<CryptoKeyPair>
  }
}


export type VerifyArgs = {
  message: Uint8Array
  publicKey: Uint8Array
  signature: Uint8Array
}
