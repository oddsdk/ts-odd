import * as Uint8arrays from "uint8arrays"

import * as Crypto from "../components/crypto/implementation.js"

import { Potency, Fact, Resource, Ucan, UcanHeader, UcanPayload } from "./types.js"
import { base64 } from "../common/index.js"
import { didToPublicKey } from "../did/transformers.js"


/**
 * Create a UCAN, User Controlled Authorization Networks, JWT.
 * This JWT can be used for authorization.
 *
 * ### Header
 *
 * `alg`, Algorithm, the type of signature.
 * `typ`, Type, the type of this data structure, JWT.
 * `uav`, UCAN version.
 *
 * ### Payload
 *
 * `aud`, Audience, the ID of who it's intended for.
 * `exp`, Expiry, unix timestamp of when the jwt is no longer valid.
 * `iss`, Issuer, the ID of who sent this.
 * `nbf`, Not Before, unix timestamp of when the jwt becomes valid.
 * `prf`, Proof, an optional nested token with equal or greater privileges.
 * `ptc`, Potency, which rights come with the token.
 * `rsc`, Resource, the involved resource.
 *
 */
export async function build({
  addSignature = true,
  audience,
  dependencies,
  facts = [],
  issuer,
  lifetimeInSeconds = 120,
  expiration,
  potency = "APPEND",
  proof,
  resource
}: {
  addSignature?: boolean
  audience: string
  dependencies: { crypto: Crypto.Implementation }
  facts?: Array<Fact>
  issuer: string
  lifetimeInSeconds?: number
  expiration?: number
  potency?: Potency
  proof?: string | Ucan
  resource?: Resource
}): Promise<Ucan> {
  const currentTimeInSeconds = Math.floor(Date.now() / 1000)
  const decodedProof = proof
    ? (typeof proof === "string" ? decode(proof) : proof)
    : null

  // Header
  const header = {
    alg: await dependencies.crypto.keystore.getUcanAlgorithm(),
    typ: "JWT",
    uav: "1.0.0" // actually 0.3.1 but server isn't updated yet
  }

  // Timestamps
  let exp = expiration || (currentTimeInSeconds + lifetimeInSeconds)
  let nbf = currentTimeInSeconds - 120

  if (decodedProof) {
    const prf = decodedProof.payload

    exp = Math.min(prf.exp, exp)
    nbf = Math.max(prf.nbf, nbf)
  }

  // Payload
  const payload = {
    aud: audience,
    exp: exp,
    fct: facts,
    iss: issuer,
    nbf: nbf,
    prf: proof ? (typeof proof === "string" ? proof : encode(proof)) : null,
    ptc: potency,
    rsc: resource ? resource : (decodedProof ? decodedProof.payload.rsc : "*"),
  }

  const signature = addSignature ? await sign(dependencies.crypto, header, payload) : null

  return {
    header,
    payload,
    signature
  }
}

/**
 * Try to decode a UCAN.
 * Will throw if it fails.
 *
 * @param ucan The encoded UCAN to decode
 */
export function decode(ucan: string): Ucan {
  const split = ucan.split(".")
  const header = JSON.parse(base64.urlDecode(split[0]))
  const payload = JSON.parse(base64.urlDecode(split[1]))

  return {
    header,
    payload,
    signature: split[2] || null
  }
}

/**
 * Encode a UCAN.
 *
 * @param ucan The UCAN to encode
 */
export function encode(ucan: Ucan): string {
  const encodedHeader = encodeHeader(ucan.header)
  const encodedPayload = encodePayload(ucan.payload)

  return encodedHeader + "." +
    encodedPayload + "." +
    ucan.signature
}

/**
 * Encode the header of a UCAN.
 *
 * @param header The UcanHeader to encode
 */
export function encodeHeader(header: UcanHeader): string {
  return base64.urlEncode(JSON.stringify(header))
}

/**
 * Encode the payload of a UCAN.
 *
 * @param payload The UcanPayload to encode
 */
export function encodePayload(payload: UcanPayload): string {
  return base64.urlEncode(JSON.stringify({
    ...payload
  }))
}

/**
 * Check if a UCAN is expired.
 *
 * @param ucan The UCAN to validate
 */
export function isExpired(ucan: Ucan): boolean {
  return ucan.payload.exp <= Math.floor(Date.now() / 1000)
}

/**
 * Check if a UCAN is self-signed.
 */
export function isSelfSigned(ucan: Ucan): boolean {
  return ucan.payload.iss === ucan.payload.aud
}

/**
 * Check if a UCAN is valid.
 *
 * @param ucan The decoded UCAN
 * @param did The DID associated with the signature of the UCAN
 */
export async function isValid(crypto: Crypto.Implementation, ucan: Ucan): Promise<boolean> {
  try {
    const encodedHeader = encodeHeader(ucan.header)
    const encodedPayload = encodePayload(ucan.payload)

    const { publicKey, type } = didToPublicKey(crypto, ucan.payload.iss)
    const algo = crypto.did.keyTypes[type]

    const a = await algo.verify({
      publicKey,
      message: Uint8arrays.fromString(`${encodedHeader}.${encodedPayload}`, "utf8"),
      signature: Uint8arrays.fromString(ucan.signature || "", "base64url")
    })

    if (!a) return a
    if (!ucan.payload.prf) return true

    // Verify proofs
    const prf = decode(ucan.payload.prf)
    const b = prf.payload.aud === ucan.payload.iss
    if (!b) return b

    return await isValid(crypto, prf)

  } catch {
    return false

  }
}

/**
 * Given a UCAN, lookup the root issuer.
 *
 * Throws when given an improperly formatted UCAN.
 * This could be a nested UCAN (ie. proof).
 *
 * @param ucan A UCAN.
 * @returns The root issuer.
 */
export function rootIssuer(ucan: string | Ucan, level = 0): string {
  const p = typeof ucan === "string" ? extractPayload(ucan, level) : ucan.payload
  if (p.prf) return rootIssuer(p.prf, level + 1)
  return p.iss
}

/**
 * Generate UCAN signature.
 */
export async function sign(
  crypto: Crypto.Implementation,
  header: UcanHeader,
  payload: UcanPayload
): Promise<string> {
  const encodedHeader = encodeHeader(header)
  const encodedPayload = encodePayload(payload)

  return Uint8arrays.toString(
    await crypto.keystore.sign(
      Uint8arrays.fromString(`${encodedHeader}.${encodedPayload}`, "utf8")
    ),
    "base64url"
  )
}


// ㊙️


/**
 * Extract the payload of a UCAN.
 *
 * Throws when given an improperly formatted UCAN.
 */
function extractPayload(ucan: string, level: number): { iss: string; prf: string | null } {
  try {
    return JSON.parse(base64.urlDecode(ucan.split(".")[1]))
  } catch (_) {
    throw new Error(`Invalid UCAN (${level} level${level === 1 ? "" : "s"} deep): \`${ucan}\``)
  }
}
