import * as uint8arrays from "uint8arrays"
import { webcrypto } from "one-webcrypto"
import tweetnacl from "tweetnacl"

import * as aes from "keystore-idb/aes/index.js"
import { HashAlg, SymmAlg, SymmKeyLength } from "keystore-idb/types.js"
import { RSAKeyStore } from "keystore-idb/rsa/index.js"
import rsaOperations from "keystore-idb/rsa/index.js"

import * as typeChecks from "../../../common/type-checks.js"
import { Implementation, ImplementationOptions } from "../implementation.js"


// AES


export function importAesKey(key: Uint8Array, alg: SymmAlg): Promise<CryptoKey> {
  return webcrypto.subtle.importKey(
    "raw",
    key,
    {
      name: alg,
      length: SymmKeyLength.B256,
    },
    true,
    [ "encrypt", "decrypt" ]
  )
}

export async function aesDecrypt(encrypted: Uint8Array, key: CryptoKey | Uint8Array, alg: SymmAlg, iv?: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = typeChecks.isCryptoKey(key) ? key : await importAesKey(key, alg)
  const decrypted = iv
    ? await webcrypto.subtle.decrypt(
      { name: alg, iv },
      cryptoKey,
      encrypted
    )
    // the keystore version prefixes the `iv` into the cipher text
    : await aes.decryptBytes(encrypted, cryptoKey, { alg })

  return new Uint8Array(decrypted)
}

export async function aesEncrypt(data: Uint8Array, key: CryptoKey | Uint8Array, alg: SymmAlg, iv?: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = typeChecks.isCryptoKey(key) ? key : await importAesKey(key, alg)

  // the keystore version prefixes the `iv` into the cipher text
  const encrypted = iv
    ? await webcrypto.subtle.encrypt(
      { name: alg, iv },
      cryptoKey,
      data
    )
    : await aes.encryptBytes(data, cryptoKey, { alg })

  return new Uint8Array(encrypted)
}

export async function aesExportKey(key: CryptoKey): Promise<Uint8Array> {
  const buffer = await webcrypto.subtle.exportKey("raw", key)
  return new Uint8Array(buffer)
}

export function aesGenKey(alg: SymmAlg): Promise<CryptoKey> {
  return aes.makeKey({ length: SymmKeyLength.B256, alg })
}



// ED25519


export async function ed25519Verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
  return tweetnacl.sign.detached.verify(message, signature, publicKey)
}



// HASH


export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await webcrypto.subtle.digest("sha-256", bytes))
}



// KEYSTORE


export function ksClearStore(ks: RSAKeyStore): Promise<void> {
  return ks.destroy()
}


export async function ksDecrypt(ks: RSAKeyStore, cipherText: Uint8Array): Promise<Uint8Array> {
  const exchangeKey = await ks.exchangeKey()

  return rsaDecrypt(
    cipherText,
    exchangeKey.privateKey
  )
}

export async function ksExportSymmKey(ks: RSAKeyStore, keyName: string): Promise<Uint8Array> {
  if (await ks.keyExists(keyName) === false) {
    throw new Error(`Expected a key under the name '${keyName}', but couldn't find anything`)
    // We're throwing an error here so that the function `getSymmKey` below doesn't create a key.
  }

  const key = await ks.getSymmKey(keyName)
  const raw = await webcrypto.subtle.exportKey("raw", key)

  return new Uint8Array(raw)
}

export function ksGetAlg(ks: RSAKeyStore): Promise<string> {
  return Promise.resolve("rsa")
}

export function ksGetUcanAlg(ks: RSAKeyStore): Promise<string> {
  return Promise.resolve("RS256")
}

export function ksImportSymmKey(ks: RSAKeyStore, key: Uint8Array, name: string): Promise<void> {
  return ks.importSymmKey(uint8arrays.toString(key, "base64pad"), name)
}

export function ksKeyExists(ks: RSAKeyStore, keyName: string): Promise<boolean> {
  return ks.keyExists(keyName)
}

export async function ksPublicExchangeKey(ks: RSAKeyStore): Promise<Uint8Array> {
  const keypair = await ks.exchangeKey()
  const spki = await webcrypto.subtle.exportKey("spki", keypair.publicKey)

  return new Uint8Array(spki)
}

export async function ksPublicWriteKey(ks: RSAKeyStore): Promise<Uint8Array> {
  const keypair = await ks.writeKey()
  const spki = await webcrypto.subtle.exportKey("spki", keypair.publicKey)

  return new Uint8Array(spki)
}

export async function ksSign(ks: RSAKeyStore, message: Uint8Array): Promise<Uint8Array> {
  const writeKey = await ks.writeKey()
  const arrayBuffer = await rsaOperations.sign(
    message,
    writeKey.privateKey,
    ks.cfg.charSize
  )

  return new Uint8Array(arrayBuffer)
}



// MISC


export function randomNumbers(options: { amount: number }): Uint8Array {
  return webcrypto.getRandomValues(new Uint8Array(options.amount))
}



// RSA
// ---
// Exchange keys only.


export const RSA_ALGORITHM = "RSA-OAEP"
export const RSA_HASHING_ALGORITHM = "SHA-256"


export function importRsaKey(key: Uint8Array, keyUsages: KeyUsage[]): Promise<CryptoKey> {
  return webcrypto.subtle.importKey(
    "spki",
    key,
    { name: RSA_ALGORITHM, hash: RSA_HASHING_ALGORITHM },
    false,
    keyUsages
  )
}

export async function rsaDecrypt(data: Uint8Array, privateKey: CryptoKey | Uint8Array): Promise<Uint8Array> {
  const arrayBuffer = await webcrypto.subtle.decrypt(
    {
      name: RSA_ALGORITHM
    },
    typeChecks.isCryptoKey(privateKey)
      ? privateKey
      : await importRsaKey(privateKey, [ "decrypt" ])
    ,
    data
  )

  return new Uint8Array(arrayBuffer)
}

export async function rsaEncrypt(message: Uint8Array, publicKey: CryptoKey | Uint8Array): Promise<Uint8Array> {
  const key = typeChecks.isCryptoKey(publicKey)
    ? publicKey
    : await importRsaKey(publicKey, [ "encrypt" ])

  const arrayBuffer = await webcrypto.subtle.encrypt(
    {
      name: RSA_ALGORITHM
    },
    key,
    message
  )

  return new Uint8Array(arrayBuffer)
}

export async function rsaExportPublicKey(key: CryptoKey): Promise<Uint8Array> {
  const buffer = await webcrypto.subtle.exportKey("spki", key)
  return new Uint8Array(buffer)
}

export function rsaGenKey(): Promise<CryptoKeyPair> {
  return webcrypto.subtle.generateKey(
    {
      name: RSA_ALGORITHM,
      modulusLength: 2048,
      publicExponent: new Uint8Array([ 0x01, 0x00, 0x01 ]),
      hash: { name: RSA_HASHING_ALGORITHM }
    },
    true,
    [ "encrypt", "decrypt" ]
  )
}

export async function rsaVerify(message: Uint8Array, signature: Uint8Array, publicKey: CryptoKey | Uint8Array): Promise<boolean> {
  return rsaOperations.verify(
    message,
    signature,
    typeChecks.isCryptoKey(publicKey)
      ? publicKey
      : await importRsaKey(publicKey, [ "verify" ]),
    8
  )
}



// 🛳


export async function implementation(
  { storeName, exchangeKeyName, writeKeyName }: ImplementationOptions
): Promise<Implementation> {
  const ks = await RSAKeyStore.init({
    charSize: 8,
    hashAlg: HashAlg.SHA_256,

    storeName,
    exchangeKeyName,
    writeKeyName,
  })

  const withKeyStore = (func: Function) => {
    return (...args: unknown[]) => func(ks, ...args)
  }

  return {
    aes: {
      decrypt: aesDecrypt,
      encrypt: aesEncrypt,
      exportKey: aesExportKey,
      genKey: aesGenKey,
    },
    ed25519: {
      verify: ed25519Verify
    },
    hash: {
      sha256,
    },
    keystore: {
      clearStore: withKeyStore(ksClearStore),
      decrypt: withKeyStore(ksDecrypt),
      exportSymmKey: withKeyStore(ksExportSymmKey),
      getAlg: withKeyStore(ksGetAlg),
      getUcanAlg: withKeyStore(ksGetUcanAlg),
      importSymmKey: withKeyStore(ksImportSymmKey),
      keyExists: withKeyStore(ksKeyExists),
      publicExchangeKey: withKeyStore(ksPublicExchangeKey),
      publicWriteKey: withKeyStore(ksPublicWriteKey),
      sign: withKeyStore(ksSign),
    },
    misc: {
      randomNumbers,
    },
    rsa: {
      decrypt: rsaDecrypt,
      encrypt: rsaEncrypt,
      exportPublicKey: rsaExportPublicKey,
      genKey: rsaGenKey,
      verify: rsaVerify
    },
  }
}
