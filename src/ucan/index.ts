import * as Raw from "multiformats/codecs/raw"
import * as Uint8arrays from "uint8arrays"
import * as Ucans from "@ucans/core"
import { DIDKey } from "iso-did/key"
import { Ucan } from "@ucans/core"
import { sha256 } from "multiformats/hashes/sha2"

import * as AgentDID from "../agent/did.js"
import { Agent } from "../components.js"
import { CID } from "../common/cid.js"
import { BuildParams, Keypair } from "./types.js"
import { rsa } from "../common/crypto.js"


export { encode, encodeHeader, encodePayload, verify, parse, isExpired, isTooEarly } from "@ucans/core"
export * from "./types.js"


// 🛠️


export async function build(
  { dependencies, ...params }: { dependencies: { agent: Agent.Implementation } } & BuildParams
): Promise<Ucan> {
  return Ucans.build(
    await plugins(dependencies.agent)
  )({
    ...params,
    issuer: params.issuer || await keyPair(dependencies.agent)
  })
}


export async function cid(ucan: Ucan): Promise<CID> {
  const ucanString = Ucans.encode(ucan)
  const multihash = await sha256.digest(
    Uint8arrays.fromString(ucanString, "utf8")
  )

  return CID.createV1(Raw.code, multihash)
}


export function decode(encoded: string): Ucan {
  const [ encodedHeader, encodedPayload, signature ] = encoded.split(".")
  const parts = Ucans.parse(encoded)


  return {
    header: parts.header,
    payload: parts.payload,
    signedData: `${encodedHeader}.${encodedPayload}`,
    signature: signature
  }
}


export function isSelfSigned(ucan: Ucan): boolean {
  return ucan.payload.iss === ucan.payload.aud
}


export async function isValid(crypto: Agent.Implementation, ucan: Ucan): Promise<boolean> {
  const plug = await plugin(crypto)
  const plugs = new Ucans.Plugins([ plug ], {})

  const signature = Uint8arrays.fromString(ucan.signature, "base64url")
  const signedData = Uint8arrays.fromString(ucan.signedData, "utf8")

  return !Ucans.isExpired(ucan)
    && !Ucans.isTooEarly(ucan)
    && plugs.verifyIssuerAlg(ucan.payload.iss, plug.jwtAlg)
    && plugs.verifySignature(ucan.payload.iss, signedData, signature)
}


export async function keyPair(agent: Agent.Implementation): Promise<Keypair> {
  const did = await AgentDID.exchange(agent)

  return {
    did: () => did,
    jwtAlg: await agent.ucanAlgorithm(),
    sign: data => agent.sign(data),
  }
}


export async function plugin(agent: Agent.Implementation): Promise<Ucans.DidKeyPlugin> {
  return {
    prefix: new Uint8Array([ 0x85, 0x24 ]), // RSA
    jwtAlg: await agent.ucanAlgorithm(),
    verifySignature: (did: string, data: Uint8Array, sig: Uint8Array) => {
      return rsa.verify({
        message: data,
        signature: sig,
        publicKey: DIDKey.fromString(did).publicKey
      })
    }
  }
}


export async function plugins(agent: Agent.Implementation): Promise<Ucans.Plugins> {
  return new Ucans.Plugins(
    [ await plugin(agent) ],
    {}
  )
}