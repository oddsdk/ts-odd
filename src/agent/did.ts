import { DIDKey } from "iso-did/key"
import { spki } from "iso-signatures/spki"

import { exportPublicKey } from "../common/crypto.js"
import * as Agent from "../components/agent/implementation.js"

/**
 * Create a DID based on the exchange key-pair of the agent.
 */
export async function exchange(agent: Agent.Implementation): Promise<string> {
  const pubKey = await agent.exchangeKey().then(exportPublicKey).then(spki.decode)
  const ksAlg = agent.keyAlgorithm()

  return DIDKey.fromPublicKey(ksAlg, pubKey).toString()
}

/**
 * Alias `exchange` to `sharing`
 */
export { exchange as sharing }

/**
 * Create a DID based on the signing key-pair.
 */
export async function signing(agent: Agent.Implementation): Promise<string> {
  const pubKey = await agent.signingKey().then(exportPublicKey).then(spki.decode)
  const ksAlg = agent.keyAlgorithm()

  return DIDKey.fromPublicKey(ksAlg, pubKey).toString()
}
