import * as Identifier from "../identifier/implementation.js"

import { AccountQuery } from "../../authority/query.js"
import { Inventory } from "../../ticket/inventory.js"
import { Ticket } from "../../ticket/types.js"
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
  identifierTicket: Ticket
): Promise<
  { registered: true; tickets: Ticket[] } | { registered: false; reason: string }
> {
  return { registered: true, tickets: [] }
}

///////////
// UCANS //
///////////

export async function did(
  identifier: Identifier.Implementation,
  tickets: Inventory
): Promise<string> {
  return identifier.did()
}

export async function hasSufficientAuthority(
  identifier: Identifier.Implementation,
  tickets: Inventory
): Promise<
  { suffices: true } | { suffices: false; reason: string }
> {
  return { suffices: true }
}

export async function provideAuthority(accountQuery: AccountQuery): Promise<Ticket[]> {
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
