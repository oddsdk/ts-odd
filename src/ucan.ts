import { CryptoSystem } from 'keystore-idb/types'

import * as did from './did'
import * as domain from './ucan/domain'
import * as keystore from './keystore'
import * as web from './ucan/web'
import * as wnfs from './ucan/wnfs'
import { base64 } from './common'
import { CID } from './ipfs'


// TYPES

export type Attenuation
  = { domain: string, cap: domain.Capability }
  | { web: string, cap: web.Capability }
  | { wnfs: string, cap: wnfs.Capability }

export type Fact =
  any

export type UcanHeader = {
  alg: string,
  typ: string,
  ucv: string
}

export type UcanPayload = {
  iss: string,
  aud: string,

  nbf: number,
  exp: number,

  prf: CID | Array<Ucan>,
  att: "*" | Array<Attenuation>,
  fct: CID | Array<Fact>
}

export type Ucan = {
  header: UcanHeader,
  payload: UcanPayload,
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
  facts?: CID | Array<Fact>
  issuer: string
  lifetimeInSeconds?: number
  proofs?: CID | Array<Ucan>
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

  if (Array.isArray(proofs)) {
    proofs.forEach(prf => {
      exp = Math.min(prf.payload.exp, exp)
      nbf = Math.max(prf.payload.nbf, nbf)
    })
  }

  // Payload
  const payload = {
    iss: issuer,
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
      prf: Array.isArray(payload.prf)
        ? payload.prf.map(decode)
        : payload.prf
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
  const payload = {
    ...ucan.payload,
    prf: Array.isArray(ucan.payload.prf)
      ? ucan.payload.prf.map(encode)
      : ucan.payload.prf
  }

  const encodedHeader = base64.urlEncode(JSON.stringify(ucan.header))
  const encodedPayload = base64.urlEncode(JSON.stringify(payload))

  return encodedHeader + '.' +
         encodedPayload + '.' +
         (ucan.signature || sign(ucan.header, ucan.payload))
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
export function isValid(ucan: Ucan, sigDid: string): Promise<boolean> {
  const encodedHeader = encodeHeader(ucan.header)
  const encodedPayload = encodePayload(ucan.payload)

  return did.verifySignedData({
    charSize: 8,
    data: `${encodedHeader}.${encodedPayload}`,
    did: sigDid,
    signature: ucan.signature || ""
  })
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


function encodeHeader(header: UcanHeader): string {
  return base64.urlEncode(JSON.stringify(header))
}

function encodePayload(payload: UcanPayload): string {
  return base64.urlEncode(JSON.stringify({
    ...payload,
    prf: Array.isArray(payload.prf) ? payload.prf.map(encode) : payload.prf
  }))
}

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
