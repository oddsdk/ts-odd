import * as Ucans from "@ucans/core"


export { Capability, Ucan } from "@ucans/core"
export type Facts = Record<string, unknown>


export type BuildParams = {
  // from/to
  audience: string
  issuer: Keypair

  // capabilities
  capabilities?: Array<Ucans.Capability>

  // time bounds
  lifetimeInSeconds?: number // expiration overrides lifetimeInSeconds
  expiration?: number
  notBefore?: number

  // proofs / other info
  facts?: Array<Ucans.Fact>
  proofs?: Array<string>
  addNonce?: boolean
}


/**
 * Ucan dictionary,
 * UCANs indexed by CID string representing the UCAN.
 */
export type Dictionary = Record<string, Ucans.Ucan>


export type Keypair = Ucans.DidableKey