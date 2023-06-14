import localforage from "localforage"

import * as crypto from "../../../common/crypto.js"
import { Implementation } from "../implementation.js"
import { hasProp } from "../../../common/index.js"


// 🛠️


export async function createExchangeKey(): Promise<CryptoKeyPair> {
  return crypto.rsa.generateKey("exchange")
}


export async function createSigningKey(): Promise<CryptoKeyPair> {
  return crypto.rsa.generateKey("sign")
}


export async function ensureKey(store: LocalForage, name: string, keyCreator: () => Promise<CryptoKeyPair>): Promise<CryptoKeyPair> {
  const e = await store.getItem(name)
  if (e && hasProp(e, "alg")) return e as unknown as CryptoKeyPair

  const k = await keyCreator()
  await store.setItem(name, k)
  return k
}


export function decrypt(
  data: Uint8Array,
  publicExchangeKey: CryptoKey
): Promise<Uint8Array> {
  return crypto.rsa.decrypt(data, publicExchangeKey)
}


export function encrypt(
  data: Uint8Array,
  privateExchangeKey: CryptoKey
): Promise<Uint8Array> {
  return crypto.rsa.encrypt(data, privateExchangeKey)
}


export function sign(
  data: Uint8Array,
  signingKey: CryptoKeyPair
): Promise<Uint8Array> {
  return crypto.rsa.sign(data, signingKey)
}



// 🛳️


export async function implementation(
  { storeName }: { storeName: string }
): Promise<Implementation> {
  const store = localforage.createInstance({ name: storeName })

  // Create keys if needed
  const exchangeKey = await ensureKey(store, "exchange-key", createExchangeKey)
  const signingKey = await ensureKey(store, "signing-key", createSigningKey)

  return {
    exchangeKey: () => Promise.resolve(exchangeKey),
    signingKey: () => Promise.resolve(signingKey),

    decrypt: data => decrypt(data, exchangeKey.publicKey),
    encrypt: data => encrypt(data, exchangeKey.privateKey),
    sign: data => sign(data, signingKey),

    keyAlgorithm: () => Promise.resolve("RSA"),
    ucanAlgorithm: () => Promise.resolve("RS256"),
  }
}