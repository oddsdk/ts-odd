import { DIDKey } from "iso-did/key"
import { webcrypto } from "one-webcrypto"
import localforage from "localforage"

import * as WebCryptoAPIAgent from "../../agent/implementation/web-crypto-api.js"
import { Implementation } from "../implementation.js"
import { rsa } from "../../../common/crypto.js"


// 🛳️


export async function implementation(
  { storeName }: { storeName: string }
): Promise<Implementation> {
  const store = localforage.createInstance({ name: storeName })

  // Ensure a signing key (this will be unique if the store name is unique)
  const signingKey = await WebCryptoAPIAgent.ensureKey(
    store,
    "signing-key",
    WebCryptoAPIAgent.createSigningKey
  )

  const exportedKey = await rsa.exportPublicKey(signingKey)

  // Implementation
  return {
    did: async () => DIDKey.fromPublicKey("RSA", exportedKey).toString(),
    sign: async data => WebCryptoAPIAgent.sign(data, signingKey),
    ucanAlgorithm: async () => "RS256",
  }
}