import { CryptoSystem } from 'keystore-idb/types'

import * as keystore from './keystore'
import { base64 } from './common'


/**
 * Create a UCAN, User Controlled Authorization Networks, JWT.
 * This JWT can be used for authorization.
 *
 * ## Header
 *
 * `alg`, Algorithm, the type of signature.
 * `typ`, Type, the type of this data structure, JWT.
 * `uav`, UCAN version.
 *
 * ## Body
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
export const build = async ({
  audience,
  issuer,
  lifetimeInSeconds = 30,
  proof,
  resource = "*"
}: {
  audience: string
  issuer: string
  lifetimeInSeconds?: number
  proof?: string
  resource?: "*" | { [_: string]: string }
}): Promise<string> => {
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
    ptc: "APPEND",
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
 * Given a UCAN, lookup the root issuer.
 *
 * Throws when given an improperly formatted UCAN.
 * This could be a nested UCAN (ie. proof).
 *
 * @param ucan A UCAN.
 * @returns The root issuer.
 */
export function rootIssuer(ucan: string, level = 0): string {
  const p = payload(ucan, level)
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
function payload(ucan: string, level: number): { iss: string; prf: string | null } {
  try {
    return JSON.parse(base64.urlDecode(ucan.split(".")[1]))
  } catch (_) {
    throw new Error(`Invalid UCAN (${level} level${level === 1 ? "" : "s"} deep): \`${ucan}\``)
  }
}
