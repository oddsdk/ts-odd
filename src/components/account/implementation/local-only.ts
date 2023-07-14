import { CID } from "../../../common/index.js"
import * as Ucan from "../../../ucan/index.js"
import { rootIssuer } from "../../../ucan/lookup.js"
import { Implementation } from "../implementation.js"

////////
// 🧩 //
////////

export type Annex = Record<string, never>

//////////////
// CREATION //
//////////////

export async function canRegister(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  return { ok: true }
}

export async function register(
  formValues: Record<string, string>,
  identifierUcan: Ucan.Ucan,
): Promise<
  { ok: true; ucans: Ucan.Ucan[] } | { ok: false; reason: string }
> {
  return { ok: true, ucans: [] }
}

///////////////
// DATA ROOT //
///////////////

export async function canUpdateDataRoot(
  identifierUcans: Ucan.Ucan[],
  ucanDictionary: Ucan.Dictionary,
): Promise<boolean> {
  return Object.values(ucanDictionary).filter(u => u.payload.att.some(a => a.with.scheme === "ucan")).length >= 1
}

export async function lookupDataRoot(
  identifierUcans: Ucan.Ucan[],
  ucanDictionary: Ucan.Dictionary,
): Promise<CID | null> {
  return null // Use the local CID log instead
}

export async function updateDataRoot(
  dataRoot: CID,
  proofs: Ucan.Ucan[],
): Promise<{ ok: true } | { ok: false; reason: string }> {
  return { ok: true }
}

///////////
// UCANS //
///////////

export async function did(
  identifierUcans: Ucan.Ucan[],
  ucanDictionary: Ucan.Dictionary,
): Promise<string> {
  const rootIssuers: Set<string> = identifierUcans.reduce(
    (set: Set<string>, identifierUcan): Set<string> => {
      const iss = rootIssuer(identifierUcan, ucanDictionary)
      return set.add(iss)
    },
    new Set() as Set<string>,
  )

  if (rootIssuers.size > 1) {
    console.warn(
      "Encounter more than one root issuer in the identifier UCANs set. This should ideally not happen. Using the first one in the set.",
    )
  }

  const root = Array.from(rootIssuers.values())[0]
  if (!root) throw new Error("Expected a root issuer to be found")
  return root
}

////////
// 🛳 //
////////

export function implementation(): Implementation<Annex> {
  return {
    annex: {},

    canRegister,
    register,

    canUpdateDataRoot,
    lookupDataRoot,
    updateDataRoot,

    did,
  }
}
