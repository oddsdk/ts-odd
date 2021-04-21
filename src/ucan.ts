import { CryptoSystem } from 'keystore-idb/types'

import * as did from './did'
import * as keystore from './keystore'
import { base64 } from './common'

// TYPES

export type SessionKey = {
  sessionKey: string
}

export type Fact = SessionKey | Record<string, string>

export type Resource =
  "*" | Record<string, string>

export type UcanHeader = {
  alg: string
  typ: string
  uav: string
}

export type UcanPayload = {
  aud: string
  exp: number
  fct: Array<Fact>
  iss: string
  nbf: number
  prf: string | null
  ptc: string | undefined | null
  rsc: Resource
}

export type Ucan = {
  header: UcanHeader
  payload: UcanPayload
  signature: string | null
}

// CONSTANTS


// TODO: Waiting on API change.
//       Should be `dnslink`
export const WNFS_PREFIX = "wnfs"



// FUNCTIONS


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
  facts = [],
  issuer,
  lifetimeInSeconds = 30,
  potency = 'APPEND',
  proof,
  resource
}: {
  addSignature?: boolean
  audience: string
  facts?: Array<Fact>
  issuer: string
  lifetimeInSeconds?: number
  potency?: string | null
  proof?: string
  resource?: Resource
}): Promise<Ucan> {
  const ks = await keystore.get()
  const currentTimeInSeconds = Math.floor(Date.now() / 1000)
  const decodedProof = proof && decode(proof)

  // Header
  const header = {
    alg: jwtAlgorithm(ks.cfg.type) || 'UnknownAlgorithm',
    typ: 'JWT',
    uav: '1.0.0' // actually 0.3.1 but server isn't updated yet
  }

  // Timestamps
  let exp = currentTimeInSeconds + lifetimeInSeconds
  let nbf = currentTimeInSeconds - 60

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
    iss: issuer || await did.ucan(),
    nbf: nbf,
    prf: proof || null,
    ptc: potency,
    rsc: resource ? resource : (decodedProof ? decodedProof.payload.rsc : '*'),
  }

  const signature = addSignature ? await sign(header, payload) : null

  return {
    header,
    payload,
    signature
  }
}

/**
 * Given a list of UCANs, generate a dictionary.
 * The key will be in the form of `${resourceKey}:${resourceValue}`
 */
export function compileDictionary(ucans: Array<string>): Record<string, string> {
  return ucans.reduce((acc, ucanString) => {
    const ucan = decode(ucanString)
    const { rsc } = ucan.payload

    if (isExpired(ucan)) return acc

    if (typeof rsc !== "object") {
      return { ...acc, [rsc]: ucanString }
    }

    const resource = Array.from(Object.entries(rsc))[0]
    const key = resource[0] + ":" + resource[1]

    return { ...acc, [key]: ucanString }
  }, {})
}

/**
 * Try to decode a UCAN.
 * Will throw if it fails.
 *
 * @param ucan The encoded UCAN to decode
 */
export function decode(ucan: string): Ucan  {
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

  return encodedHeader + '.' +
         encodedPayload + '.' +
         (ucan.signature || sign(ucan.header, ucan.payload))
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
 * Check if a UCAN is valid.
 *
 * @param ucan The decoded UCAN
 * @param did The DID associated with the signature of the UCAN
 */
 export async function isValid(ucan: Ucan): Promise<boolean> {
  const encodedHeader = encodeHeader(ucan.header)
  const encodedPayload = encodePayload(ucan.payload)

  const a = await did.verifySignedData({
    charSize: 8,
    data: `${encodedHeader}.${encodedPayload}`,
    did: ucan.payload.iss,
    signature: base64.makeUrlUnsafe(ucan.signature || "")
  })

  if (!a) return a
  if (!ucan.payload.prf) return true

  // Verify proofs
  const prf = decode(ucan.payload.prf)
  const b = prf.payload.aud === ucan.payload.iss
  if (!b) return b

  return await isValid(prf)
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
export function rootIssuer(ucan: string, level = 0): string {
  const p = extractPayload(ucan, level)
  if (p.prf) return rootIssuer(p.prf, level + 1)
  return p.iss
}

/**
 * Generate UCAN signature.
 */
export async function sign(header: UcanHeader, payload: UcanPayload): Promise<string> {
  const encodedHeader = encodeHeader(header)
  const encodedPayload = encodePayload(payload)
  const ks = await keystore.get()

  return base64.makeUrlSafe(
    await ks.sign(`${encodedHeader}.${encodedPayload}`, { charSize: 8 })
  )
}


// ㊙️


/**
 * JWT algorithm to be used in a JWT header.
 */
function jwtAlgorithm(cryptoSystem: string): string | null {
  switch (cryptoSystem) {
    case "ed25519": return 'EdDSA';
    case "rsa": return 'RS256';
    default: return null
  }
}


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
