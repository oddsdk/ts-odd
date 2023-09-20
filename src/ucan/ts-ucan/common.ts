import * as Ucans from "@ucans/core"
import * as UcanCaps from "@ucans/core/capability/index"
import * as Raw from "multiformats/codecs/raw"
import * as Uint8arrays from "uint8arrays"

import * as ECDSA from "iso-signatures/verifiers/ecdsa"
import * as EDDSA from "iso-signatures/verifiers/eddsa"
import { Resolver } from "iso-signatures/verifiers/resolver"
import * as RSA from "iso-signatures/verifiers/rsa"

import { Ucan } from "@ucans/core"
import { DIDKey } from "iso-did/key"

import * as AgentDID from "../../agent/did.js"
import * as Agent from "../../components/agent/implementation.js"

import { sha256 } from "multiformats/hashes/sha2"
import { CID, decodeCID } from "../../common/cid.js"
import { Ticket } from "../../ticket/types.js"
import { BuildParams, Keypair } from "./types.js"

////////
// 🛠️ //
////////

export async function build(
  params: BuildParams
): Promise<Ucan> {
  const plugs = await plugins()
  const keypair = params.issuer

  const oldPayload = Ucans.buildPayload({ ...params, issuer: keypair.did() })
  const adjustedPayload = adjustPayloadTo090(oldPayload)

  const header: Ucans.UcanHeader = {
    alg: keypair.jwtAlg,
    typ: "JWT",
    ucv: { major: 0, minor: 9, patch: "0-canary" as unknown as number }, // hack to get talking to rs-ucan
  }

  // Issuer key type must match UCAN algorithm
  if (!plugs.verifyIssuerAlg(adjustedPayload.iss as string, keypair.jwtAlg)) {
    throw new Error("The issuer's key type must match the given key type.")
  }

  // Encode parts
  const encodedHeader = Ucans.encodeHeader(header)
  const encodedPayload = Uint8arrays.toString(
    Uint8arrays.fromString(
      JSON.stringify(
        {
          ...adjustedPayload,
          att: adjustedPayload.att.map(UcanCaps.encode),
        }
      ),
      "utf8"
    ),
    "base64url"
  )

  // Sign
  const signedData = `${encodedHeader}.${encodedPayload}`
  const toSign = Uint8arrays.fromString(signedData, "utf8")
  const sig = await keypair.sign(toSign)

  // 📦
  return Object.freeze({
    header,
    payload: oldPayload,
    signedData,
    signature: Uint8arrays.toString(sig, "base64url"),
  })
}

export function decode(encoded: string): Ucan {
  const [encodedHeader, encodedPayload, signature] = encoded.split(".")
  const parts = Ucans.parse(encoded)

  return {
    header: parts.header,
    payload: parts.payload,
    signedData: `${encodedHeader}.${encodedPayload}`,
    signature: signature,
  }
}

export function encode(ucan: Ucan): string {
  return `${ucan.signedData}.${ucan.signature}`
}

export async function isValid(agent: Agent.Implementation, ucan: Ucan): Promise<boolean> {
  const plugs = await plugins()
  const jwtAlg = agent.ucanAlgorithm()

  const signature = Uint8arrays.fromString(ucan.signature, "base64url")
  const signedData = Uint8arrays.fromString(ucan.signedData, "utf8")

  return !Ucans.isExpired(ucan)
    && !Ucans.isTooEarly(ucan)
    && plugs.verifyIssuerAlg(ucan.payload.iss, jwtAlg)
    && plugs.verifySignature(ucan.payload.iss, signedData, signature)
}

export async function keyPair(agent: Agent.Implementation): Promise<Keypair> {
  const did = await AgentDID.signing(agent)

  return {
    did: () => did,
    jwtAlg: agent.ucanAlgorithm(),
    sign: data => agent.sign(data),
  }
}

export async function plugins(): Promise<Ucans.Plugins> {
  return new Plugins([], {})
}

export async function ticketCID(ticket: Ticket): Promise<CID> {
  const multihash = await sha256.digest(
    Uint8arrays.fromString(ticket.token, "utf8")
  )

  return CID.createV1(Raw.code, multihash)
}

export function ticketProofResolver(ticket: Ticket): CID[] {
  const ucan = decode(ticket.token)
  return ucan.payload.prf.map(decodeCID)
}

export function toTicket(ucan: Ucan): Ticket {
  return {
    issuer: ucan.payload.iss,
    audience: ucan.payload.aud,
    token: encode(ucan),
  }
}

////////
// ㊙️ //
////////

function adjustPayloadTo090(payload: Ucans.UcanPayload) {
  return {
    iss: payload.iss,
    aud: payload.aud,
    exp: payload.exp || Math.floor(Date.now() / 1000) + 120,
    nbf: payload.nbf || Math.floor(Date.now() / 1000),
    att: payload.att,
    fct: payload.fct || [],
    prf: payload.prf,
  }
}

class Plugins extends Ucans.Plugins {
  verifyIssuerAlg(did: string, jwtAlg: string): boolean {
    const dk = DIDKey.fromString(did)
    return dk.alg === jwtAlg
  }

  async verifySignature(did: string, data: Uint8Array, sig: Uint8Array): Promise<boolean> {
    const resolver = new Resolver(
      {
        ...ECDSA.verifier,
        ...EDDSA.verifier,
        ...RSA.verifier,
      },
      { cache: true }
    )

    const dk = DIDKey.fromString(did)

    return resolver.verify({
      alg: dk.alg,
      signature: sig,
      message: data,
      publicKey: dk.publicKey,
    })
  }
}
