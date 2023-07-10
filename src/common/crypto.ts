import { webcrypto } from "one-webcrypto"

// @ts-ignore
import { spki } from "iso-signatures/spki"

import { isCryptoKey } from "./type-checks.js"


// 🧩


export type KeyUse = "exchange" | "sign"


export type Store = {
  getItem: (name: string) => Promise<CryptoKeyPair | CryptoKey | null>
  setItem: (name: string, key: CryptoKeyPair | CryptoKey) => Promise<unknown>
}


export type VerifyArgs = {
  message: Uint8Array
  publicKey: Uint8Array
  signature: Uint8Array
}



// MISC


export const misc = {
  randomNumbers,
}


export function randomNumbers(options: { amount: number }): Uint8Array {
  return webcrypto.getRandomValues(new Uint8Array(options.amount))
}



// RSA


export const RSA_EXCHANGE_ALGORITHM = "RSA-OAEP"
export const RSA_SIGNING_ALGORITHM = "RSASSA-PKCS1-v1_5"
export const RSA_HASHING_ALGORITHM = "SHA-256"
export const RSA_SALT_LENGTH = 128


export type RSA_ALG = (typeof RSA_EXCHANGE_ALGORITHM | typeof RSA_SIGNING_ALGORITHM)


export const rsa = {
  decrypt: rsaDecrypt,
  encrypt: rsaEncrypt,
  exportPublicKey: exportPublicRsaKey,
  generateKey: rsaGenerateKey,
  importKey: importRsaKey,
  sign: rsaSign,
  verify: rsaVerify,
}


export async function exportPublicRsaKey(key: CryptoKeyPair): Promise<Uint8Array> {
  return webcrypto.subtle
    .exportKey("spki", key.publicKey)
    .then(a => spki.decode(new Uint8Array(a)))
}


export function importRsaKey(key: Uint8Array, alg: RSA_ALG, keyUsages: KeyUsage[]): Promise<CryptoKey> {
  return webcrypto.subtle.importKey(
    "spki",
    key,
    {
      name: alg,
      hash: RSA_HASHING_ALGORITHM
    },
    false,
    keyUsages
  )
}


export async function rsaDecrypt(data: Uint8Array, privateKey: CryptoKey | Uint8Array) {
  const arrayBuffer = await webcrypto.subtle.decrypt(
    {
      name: RSA_EXCHANGE_ALGORITHM
    },
    isCryptoKey(privateKey)
      ? privateKey
      : await importRsaKey(privateKey, RSA_EXCHANGE_ALGORITHM, [ "decrypt" ])
    ,
    data
  )

  return new Uint8Array(arrayBuffer)
}


export async function rsaEncrypt(data: Uint8Array, publicKey: CryptoKey | Uint8Array) {
  console.log("rsaEncrypt", publicKey)
  // @ts-ignore
  isCryptoKey(publicKey) ? console.log("algorithm.hash", publicKey.algorithm.hash) : null;
  // @ts-ignore
  isCryptoKey(publicKey) ? console.log("algorithm.publicExponent", publicKey.algorithm.publicExponent) : null;
  console.log("isCryptoKey", isCryptoKey(publicKey))

  const arrayBuffer = await webcrypto.subtle.encrypt(
    {
      name: RSA_EXCHANGE_ALGORITHM
    },
    isCryptoKey(publicKey)
      ? publicKey
      : await importRsaKey(publicKey, RSA_EXCHANGE_ALGORITHM, [ "encrypt" ])
    ,
    data
  )

  return new Uint8Array(arrayBuffer)
}


export function rsaGenerateKey(keyUse: KeyUse): Promise<CryptoKeyPair> {
  return webcrypto.subtle.generateKey(
    {
      name: keyUse === "exchange"
        ? RSA_EXCHANGE_ALGORITHM
        : RSA_SIGNING_ALGORITHM,
      modulusLength: 2048,
      publicExponent: new Uint8Array([ 0x01, 0x00, 0x01 ]),
      hash: { name: RSA_HASHING_ALGORITHM }
    },
    false,
    keyUse === "exchange"
      ? [ "encrypt", "decrypt" ]
      : [ "sign", "verify" ]
  )
}


export async function rsaSign(data: Uint8Array, signingKey: CryptoKeyPair): Promise<Uint8Array> {
  const arrayBuffer = await webcrypto.subtle.sign(
    { name: RSA_SIGNING_ALGORITHM, saltLength: RSA_SALT_LENGTH },
    signingKey.privateKey,
    data
  )

  return new Uint8Array(arrayBuffer)
}


export async function rsaVerify({ message, publicKey, signature }: VerifyArgs): Promise<boolean> {
  return webcrypto.subtle.verify(
    { name: RSA_SIGNING_ALGORITHM, saltLength: RSA_SALT_LENGTH },
    await importRsaKey(publicKey, RSA_SIGNING_ALGORITHM, [ "verify" ]),
    signature,
    message,
  )
}