import { DIDKey } from "iso-did/key"
import { spki } from "iso-signatures/spki"

import * as WebCryptoAPIAgent from "../agent/web-crypto-api.js"

import { exportPublicKey } from "../../common/crypto.js"
import { Store } from "../../common/crypto/store.js"
import { Implementation } from "./implementation.js"

////////
// 🛳️ //
////////

export async function implementation(
  { store }: { store: Store }
): Promise<Implementation> {
  const signingKey = await WebCryptoAPIAgent.ensureKey(
    store,
    "signing-key",
    WebCryptoAPIAgent.createSigningKey
  )

  const exportedKey = await exportPublicKey(signingKey).then(spki.decode)

  return {
    did: () => DIDKey.fromPublicKey("RSA", exportedKey).toString(),
    sign: async data => WebCryptoAPIAgent.sign(data, signingKey),
    ucanAlgorithm: () => "RS256",
  }
}
