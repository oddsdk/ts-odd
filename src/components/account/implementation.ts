import * as Identifier from "../identifier/implementation.js"

import { AccountQuery } from "../../authority/query.js"
import { Dictionary } from "../../ucan/dictionary.js"
import { Ucan } from "../../ucan/types.js"

////////
// 🧩 //
////////

export type AnnexParentType = Record<string, Function>

export type Implementation<Annex extends AnnexParentType> = {
  /**
   * Additional methods you want to be part of `program.account`
   */
  annex: (identifier: Identifier.Implementation, ucanDictionary: Dictionary) => Annex

  // CREATION

  /**
   * Can these form values be used to register an account?
   */
  canRegister: (formValues: Record<string, string>) => Promise<
    { canRegister: true } | { canRegister: false; reason: string }
  >

  /**
   * How to register an account with this account system.
   */
  register: (formValues: Record<string, string>, identifierUcan: Ucan) => Promise<
    { registered: true; ucans: Ucan[] } | { registered: false; reason: string }
  >

  // IDENTIFIER & AUTHORITY

  /**
   * The DID associated with this account.
   */
  did(identifier: Identifier.Implementation, ucanDictionary: Dictionary): Promise<string | null>

  /**
   * Check if we have everything we need (eg. capabilities) regarding the account.
   */
  hasSufficientAuthority(identifier: Identifier.Implementation, ucanDictionary: Dictionary): Promise<
    { suffices: true } | { suffices: false; reason: string }
  >

  /**
   * Provides UCANs to those who request authority.
   * Authority can be granted based on the received queries.
   */
  provideAuthority(query: AccountQuery): Promise<Ucan[]>
}
