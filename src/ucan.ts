import { CryptoSystem } from 'keystore-idb/types'

import * as keystore from './keystore'
import { base64 } from './common'


// TYPES


export type Resource =
  "*" | Record<string, string>

export type Ucan = {
  header: {
    alg: string,
    typ: string,
    uav: string
  },
  payload: {
    aud: string,
    exp: number,
    iss: string,
    nbf: string,
    prf: string | undefined,
    ptc: string | undefined | null,
    rsc: Resource
  },
  signature: string
}



// CONSTANTS


// TODO: Waiting on API change.
//       Should be `dnslink`
export const WNFS_PREFIX = "floofs"



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
  audience,
  issuer,
  lifetimeInSeconds = 30,
  potency = 'APPEND',
  proof,
  resource = "*"
}: {
  audience: string
  issuer: string
  lifetimeInSeconds?: number
  potency?: string | null
  proof?: string
  resource?: Resource
}): Promise<string> {
  const ks = await keystore.get()
  const currentTimeInSeconds = Math.floor(Date.now() / 1000)

  // Parts
  const header = {
    alg: jwtAlgorithm(ks.cfg.type) || 'UnknownAlgorithm',
    typ: 'JWT',
    uav: '1.0.0',
  }

  const payload = {
    aud: audience,
    exp: currentTimeInSeconds + lifetimeInSeconds,
    iss: issuer,
    nbf: currentTimeInSeconds - 60,
    prf: proof,
    ptc: potency,
    rsc: resource,
  }

  // Encode parts in JSON & Base64Url
  const encodedHeader = base64.urlEncode(JSON.stringify(header))
  const encodedPayload = base64.urlEncode(JSON.stringify(payload))

  // Signature
  const signed = await ks.sign(`${encodedHeader}.${encodedPayload}`, { charSize: 8 })
  const encodedSignature = base64.makeUrlSafe(signed)

  // Make JWT
  return encodedHeader + '.' +
         encodedPayload + '.' +
         encodedSignature
}

/**
 * Given a list of UCANs, generate a dictionary.
 * The key will be in the form of `${resourceKey}:${resourceValue}`
 */
export function compileDictionary(ucans: Array<string>): Record<string, Ucan> {
  return ucans.reduce((acc, ucanString) => {
    const ucan = decode(ucanString)
    const { rsc } = ucan.payload

    if (typeof rsc !== "object") {
      return { ...acc, [rsc]: ucan }
    }

    const resource = Array.from(Object.entries(rsc))[0]
    const key = resource[0] + ":" + (
      resource[0] === WNFS_PREFIX
        ? resource[1].replace(/\/+$/, "")
        : resource[1]
    )

    return { ...acc, [key]: ucan }
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
    signature: split[2]
  }
}

/**
 * Encode a UCAN.
 *
 * @param ucan The UCAN to encode
 */
export function encode(ucan: Ucan): string {
  const encodedHeader = base64.urlEncode(JSON.stringify(ucan.header))
  const encodedPayload = base64.urlEncode(JSON.stringify(ucan.payload))

  return encodedHeader + '.' +
         encodedPayload + '.' +
         ucan.signature
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
