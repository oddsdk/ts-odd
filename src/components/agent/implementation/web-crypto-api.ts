import * as crypto from "../../../common/crypto.js"
import { Implementation } from "../implementation.js"
import { hasProp } from "../../../common/index.js"
import { Store } from "../../../common/crypto/store.js"


// 🛠️


export async function createExchangeKey(): Promise<CryptoKeyPair> {
  return crypto.rsa.generateKey("exchange")
}


export async function createSigningKey(): Promise<CryptoKeyPair> {
  return crypto.rsa.generateKey("sign")
}


export async function ensureKey(store: Store, name: string, keyCreator: () => Promise<CryptoKeyPair>): Promise<CryptoKeyPair> {
  const e = await store.getItem(name)
  if (e && hasProp(e, "alg")) return e as unknown as CryptoKeyPair

  const k = await keyCreator()
  await store.setItem(name, k)
  return k
}


export function decrypt(
  data: Uint8Array,
  privateExchangeKey: CryptoKey
): Promise<Uint8Array> {
  return crypto.rsa.decrypt(data, privateExchangeKey)
}


export function encrypt(
  data: Uint8Array,
  publicExchangeKey: CryptoKey
): Promise<Uint8Array> {
  return crypto.rsa.encrypt(data, publicExchangeKey)
}


export function sign(
  data: Uint8Array,
  signingKey: CryptoKeyPair
): Promise<Uint8Array> {
  return crypto.rsa.sign(data, signingKey)
}



// 🛳️


export async function implementation(
  { store }: { store: Store }
): Promise<Implementation> {
  const exchangeKey = await ensureKey(store, "exchange-key", createExchangeKey)
  const signingKey = await ensureKey(store, "signing-key", createSigningKey)

  return {
    exchangeKey: () => Promise.resolve(exchangeKey),
    signingKey: () => Promise.resolve(signingKey),

    decrypt: data => decrypt(data, exchangeKey.privateKey),
    encrypt: data => encrypt(data, exchangeKey.publicKey),
    sign: data => sign(data, signingKey),

    keyAlgorithm: () => Promise.resolve("RSA"),
    ucanAlgorithm: () => Promise.resolve("RS256"),
  }
}