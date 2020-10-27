import { CryptoSystem } from 'keystore-idb/types'

import * as did from './did'
import * as domain from './ucan/domain'
import * as keystore from './keystore'
import * as web from './ucan/web'
import * as wnfs from './ucan/wnfs'
import { base64, identity } from './common'
import { CID } from './ipfs'


// TYPES

export type Attenuation
  = { domain: string, cap: domain.Capability }
  | { web: string, cap: web.Capability }
  | { wnfs: string, cap: wnfs.Capability }

export type Fact =
  any

export type UcanHeader = {
  alg: string
  typ: string
  ucv: string
}

export type UcanPayload = {
  iss: string
  aud: string

  nbf: number
  exp: number

  prf: Array<Ucan> // TODO: Array<Ucan | CID>
  fct: Array<Fact> // TODO: Array<Fact | CID>
  att: "*" | Array<Attenuation>
}

export type Ucan = {
  header: UcanHeader
  payload: UcanPayload
  signature: string | null
}



// FUNCTIONS


/**
 * Create a UCAN, User Controlled Authorization Networks, JWT.
 * This JWT can be used for authorization.
 *
 * ### Header
 *
 * `alg`, Algorithm, the type of signature.
 * `typ`, Type, the type of this data structure, JWT.
 * `ucv`, UCAN version.
 *
 * ### Payload
 *
 * `iss`, Issuer, the ID of who sent this.
 * `aud`, Audience, the ID of who it's intended for.
 *
 * `nbf`, Not Before, unix timestamp of when the jwt becomes valid.
 * `exp`, Expiry, unix timestamp of when the jwt is no longer valid.
 *
 * `prf`, Proof, an optional nested token with equal or greater privileges.
 * `att`, Attenuation, an array of heterogeneous resources and capabilities.
 * `fct`, Facts, optional field for arbitrary facts and proofs of knowledge.
 *
 */
export async function build({
  addSignature = true,
  attenuations = [],
  audience,
  facts = [],
  issuer,
  lifetimeInSeconds = 30,
  proofs = []
}: {
  addSignature?: boolean
  attenuations?: Array<Attenuation>
  audience: string
  facts?: Array<Fact>
  issuer?: string
  lifetimeInSeconds?: number
  proofs?: Array<Ucan>
}): Promise<Ucan> {
  const ks = await keystore.get()
  const currentTimeInSeconds = Math.floor(Date.now() / 1000)

  // Header
  const header = {
    alg: jwtAlgorithm(ks.cfg.type) || 'UnknownAlgorithm',
    typ: 'JWT',
    ucv: '0.4.0',
  }

  // Timestamps
  let exp = currentTimeInSeconds + lifetimeInSeconds
  let nbf = currentTimeInSeconds - 60

  proofs.forEach(prf => {
    exp = Math.min(prf.payload.exp, exp)
    nbf = Math.max(prf.payload.nbf, nbf)
  })

  // Payload
  const payload = {
    iss: issuer || await did.ucan(),
    aud: audience,

    nbf: nbf,
    exp: exp,

    prf: proofs,
    att: attenuations,
    fct: facts,
  }

  // Signature
  const signature = addSignature
    ? await sign(header, payload)
    : null

  // Put em' together
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
export function compileDictionary(ucans: Array<string>): Record<string, Ucan> {
  return ucans.reduce((acc, ucanString) => {
    const ucan = decode(ucanString)
    const { att } = ucan.payload

    if (att === "*") {
      return { ...acc, "*": ucan }
    } else if (typeof att !== "object") {
      return acc
    }

    return att.reduce((treasure, a) => {
      const obj = { ...a }
      delete obj.cap

      const resource = Array.from(Object.entries(obj))[0]
      const key = resource[0] + ":" + (
        resource[0] === wnfs.PREFIX
          ? resource[1].replace(/\/+$/, "")
          : resource[1]
      )

      return { ...treasure, [key]: ucan }
    }, acc)
  }, {})
}

/**
 * Try to decode a UCAN.
 * Will throw if it fails.
 *
 * TODO: Keep original encoded header and payload?
 *       When validating the signature, the result of
 *       re-encoding the header and payload could be different.
 *
 * @param ucan The encoded UCAN to decode
 */
export function decode(ucan: string): Ucan  {
  const split = ucan.split(".")
  const header = JSON.parse(base64.urlDecode(split[0]))
  const payload = JSON.parse(base64.urlDecode(split[1]))

  return {
    header,
    payload: {
      ...payload,
      prf: payload.prf.map(decode)
    },
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
    ...payload,
    prf: payload.prf.map(encode)
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
    signature: ucan.signature || ""
  })

  if (!a) return a

  // Verify proofs
  const b = ucan.payload.prf
    .map(prf => prf.payload.aud)
    .every(a => a === ucan.payload.iss)

  if (!b) return b

  const c = ucan.payload.prf.map(isValid)

  return await Promise
    .all(c)
    .then(list => list.every(identity))
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
 * Make a UCAN signature.
 *
 * @param header The header of the UCAN
 * @param payload The payload of the UCAN
 */
export async function sign(header: UcanHeader, payload: UcanPayload): Promise<string> {
  const encodedHeader = encodeHeader(header)
  const encodedPayload = encodePayload(payload)
  const ks = await keystore.get()

  return ks.sign(`${encodedHeader}.${encodedPayload}`, { charSize: 8 })
}



// ㊙️


function extractPayload(ucan: string, level: number): { iss: string; prf: string | null } {
  try {
    return JSON.parse(base64.urlDecode(ucan.split(".")[1]))
  } catch (_) {
    throw new Error(`Invalid UCAN (${level} level${level === 1 ? "" : "s"} deep): \`${ucan}\``)
  }
}

function jwtAlgorithm(cryptoSystem: CryptoSystem): string | null {
  switch (cryptoSystem) {
    // case ED: return 'EdDSA';
    case CryptoSystem.RSA: return 'RS256';
    default: return null
  }
}
