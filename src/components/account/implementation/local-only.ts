import { CID, decodeCID, encodeCID } from "../../../common/cid.js"
import { Storage } from "../../../components.js"
import * as Ucan from "../../../ucan/index.js"
import { rootIssuer } from "../../../ucan/lookup.js"
import { Implementation } from "../implementation.js"

////////
// 🧩 //
////////

export type Annex = Record<string, never>
export type Dependencies = { storage: Storage.Implementation }

//////////////
// CREATION //
//////////////

export async function canRegister(): Promise<
  { canRegister: true } | { canRegister: false; reason: string }
> {
  return { canRegister: true }
}

export async function register(
  formValues: Record<string, string>,
  identifierUcan: Ucan.Ucan
): Promise<
  { registered: true; ucans: Ucan.Ucan[] } | { registered: false; reason: string }
> {
  return { registered: true, ucans: [] }
}

///////////////
// DATA ROOT //
///////////////

export async function canUpdateDataRoot(
  identifierUcans: Ucan.Ucan[],
  ucanDictionary: Ucan.Dictionary
): Promise<boolean> {
  return true
}

export async function lookupDataRoot(
  dependencies: Dependencies,
  identifierUcans: Ucan.Ucan[],
  ucanDictionary: Ucan.Dictionary
): Promise<CID | null> {
  return decodeCID(dependencies.storage.getItem("data-root"))
}

export async function updateDataRoot(
  dependencies: Dependencies,
  dataRoot: CID,
  proofs: Ucan.Ucan[]
): Promise<{ updated: true } | { updated: false; reason: string }> {
  await dependencies.storage.setItem("data-root", encodeCID(dataRoot))
  return { updated: true }
}

///////////
// UCANS //
///////////

export async function did(
  identifierUcans: Ucan.Ucan[],
  ucanDictionary: Ucan.Dictionary
): Promise<string> {
  const rootIssuers: Set<string> = identifierUcans.reduce(
    (set: Set<string>, identifierUcan): Set<string> => {
      const iss = rootIssuer(identifierUcan, ucanDictionary)
      return set.add(iss)
    },
    new Set() as Set<string>
  )

  if (rootIssuers.size > 1) {
    console.warn(
      "Encountered more than one root issuer in the identifier UCANs set. This should ideally not happen. Using the first one in the set."
    )
  }

  const root = Array.from(rootIssuers.values())[0]
  if (!root) throw new Error("Expected a root issuer to be found")
  return root
}

////////
// 🛳 //
////////

export function implementation(
  dependencies: Dependencies
): Implementation<Annex> {
  return {
    annex: {},

    canRegister,
    register,

    canUpdateDataRoot,
    lookupDataRoot: (...args) => lookupDataRoot(dependencies, ...args),
    updateDataRoot: (...args) => updateDataRoot(dependencies, ...args),

    did,
  }
}
