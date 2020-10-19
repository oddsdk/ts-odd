import { CryptoSystem } from 'keystore-idb/types'

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
  {
    sha256: string,
    msg: string
  }

export type Ucan = {
  header: {
    alg: string,
    typ: string,
    ucv: string
  },
  payload: {
    iss: string,
    aud: string,

    nbf: number,
    exp: number,

    prf: CID | Ucan | undefined,
    att: "*" | Array<Attenuation>,
    fct: CID | Array<Fact>
  },
  signature: string
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
  attenuations = [],
  audience,
  facts = [],
  issuer,
  lifetimeInSeconds = 30,
  proof
}: {
  attenuations?: Array<Attenuation>
  audience: string
  facts?: CID | Array<Fact>,
  issuer: string
  lifetimeInSeconds?: number
  proof?: CID | Ucan
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

  if (proof) {
    const prf = typeof proof === "string"
      ? decode(proof).payload
      : proof.payload

    exp = Math.min(prf.exp, exp)
    nbf = Math.max(prf.nbf, nbf)
  }

  // Payload
  const payload = {
    iss: issuer,
    aud: audience,

    nbf: nbf,
    exp: exp,

    prf: proof,
    att: attenuations,
    fct: facts,
  }

  // Signature
  const encodedHeader = base64.urlEncode(JSON.stringify(header))
  const encodedPayload = base64.urlEncode(JSON.stringify(payload))
  const signature = await ks.sign(`${encodedHeader}.${encodedPayload}`, { charSize: 8 })

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
export function decode(ucan: string, recursive = false): Ucan  {
  const split = ucan.split(".")
  const header = JSON.parse(base64.urlDecode(split[0]))
  const payload = JSON.parse(base64.urlDecode(split[1]))

  return {
    header,
    payload: payload.proof && recursive
      ? decode(payload.proof, true)
      : payload.proof,
    signature: split[2]
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
    prf: ucan.payload.prf && typeof ucan.payload.prf === "object"
      ? encode(ucan.payload.prf)
      : ucan.payload.prf
  }

  const encodedHeader = base64.urlEncode(JSON.stringify(ucan.header))
  const encodedPayload = base64.urlEncode(JSON.stringify(payload))

  return encodedHeader + '.' +
         encodedPayload + '.' +
         ucan.signature
}

/**
 * Check if a UCAN is encoded.
 *
 * @param ucan The UCAN to check
 */
export function isEncoded(ucan: Ucan | string): boolean {
  return typeof ucan === "string"
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



// ㊙️


/**
 * JWT algorithm to be used in a JWT header.
 */
function jwtAlgorithm(cryptoSystem: CryptoSystem): string | null {
  switch (cryptoSystem) {
    // case ED: return 'EdDSA';
    case CryptoSystem.RSA: return 'RS256';
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
