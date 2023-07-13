import { Query } from "../../access/query.js"
import { CID } from "../../common/cid.js"
import { Dictionary as UcanDictionary, Ucan } from "../../ucan/types.js"

////////
// 🧩 //
////////

export type AnnexParentType = Record<string, Function>

export type Implementation<Annex extends AnnexParentType> = {
  /**
   * Additional methods you want to be part of `program.accounst`
   */
  annex: Annex

  // CREATION

  /**
   * Can these form values be used to register an account?
   */
  canRegister: (formValues: Record<string, string>) => Promise<
    { ok: true } | { ok: false; reason: string }
  >

  /**
   * How to register an account with this account system.
   */
  register: (formValues: Record<string, string>, identifierUcan: Ucan) => Promise<
    { ok: true; ucans: Ucan[] } | { ok: false; reason: string }
  >

  // DATA ROOT

  /**
   * Do we have the ability to update the data root?
   */
  canUpdateDataRoot: (identifierUcans: Ucan[], ucanDictionary: UcanDictionary) => Promise<boolean>

  /**
   * Look up the data root.
   */
  lookupDataRoot: (identifierUcans: Ucan[], ucanDictionary: UcanDictionary) => Promise<CID | null>

  /**
   * How to update the data root, the top-level pointer of the file system.
   */
  updateDataRoot: (dataRoot: CID, proofs: Ucan[]) => Promise<{ ok: true } | { ok: false; reason: string }>

  // UCAN

  /**
   * The DID associated with this account.
   */
  did(identifierUcans: Ucan[], ucanDictionary: UcanDictionary): Promise<string>
}
