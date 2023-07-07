import { DIDKey } from "iso-did/key"
import localforage from "localforage"

import * as WebCryptoAPIAgent from "../../agent/implementation/web-crypto-api.js"
import * as crypto from "../../../common/crypto.js"

import { Implementation } from "../implementation.js"
import { rsa } from "../../../common/crypto.js"


// 🛳️


export async function implementation(
  { store }: { store: crypto.Store }
): Promise<Implementation> {
  const signingKey = await WebCryptoAPIAgent.ensureKey(
    store,
    "signing-key",
    WebCryptoAPIAgent.createSigningKey
  )

  const exportedKey = await rsa.exportPublicKey(signingKey)

  return {
    did: async () => DIDKey.fromPublicKey("RSA", exportedKey).toString(),
    sign: async data => WebCryptoAPIAgent.sign(data, signingKey),
    ucanAlgorithm: async () => "RS256",
  }
}