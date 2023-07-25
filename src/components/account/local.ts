import * as Identifier from "../identifier/implementation.js"

import { AccountQuery } from "../../authority/query.js"
import { Dictionary } from "../../ucan/dictionary.js"
import { Ucan } from "../../ucan/index.js"
import { Implementation } from "./implementation.js"

////////
// 🧩 //
////////

export type Annex = Record<string, never>

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
  identifierUcan: Ucan
): Promise<
  { registered: true; ucans: Ucan[] } | { registered: false; reason: string }
> {
  return { registered: true, ucans: [] }
}

///////////
// UCANS //
///////////

export async function did(
  identifier: Identifier.Implementation,
  ucanDictionary: Dictionary
): Promise<string> {
  const identifierUcans = ucanDictionary.lookupByAudience(
    await identifier.did()
  )

  const rootIssuers: Set<string> = identifierUcans.reduce(
    (set: Set<string>, identifierUcan): Set<string> => {
      const iss = ucanDictionary.rootIssuer(identifierUcan)
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

export async function hasSufficientAuthority(
  identifier: Identifier.Implementation,
  ucanDictionary: Dictionary
): Promise<
  { suffices: true } | { suffices: false; reason: string }
> {
  return { suffices: true }
}

export async function provideAuthority(accountQuery: AccountQuery): Promise<Ucan[]> {
  return [] // TODO
}

////////
// 🛳 //
////////

export function implementation(): Implementation<Annex> {
  return {
    annex: () => ({}),

    canRegister,
    register,

    did,
    hasSufficientAuthority,
    provideAuthority,
  }
}
