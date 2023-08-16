import * as Fission from "../../common/fission.js"
import * as Annexes from "./fission/implementations/annexes.js"

import { Dependencies } from "./fission/implementations/common.js"
import { Implementation } from "./implementation.js"

import * as Delegated from "./fission/implementations/delegated.js"
import * as Standard from "./fission/implementations/standard.js"

////////
// 🛳 //
////////

export { Annexes, Dependencies }

/**
 * The account implementation for delegated Fission accounts.
 * This implementation depends on given UCANs in order to operate,
 * it cannot register accounts.
 */
export function delegated<FS>(
  dependencies: Dependencies<FS>,
  optionalEndpoints?: Fission.Endpoints
): Implementation<Delegated.Annex> {
  const endpoints = optionalEndpoints || Fission.PRODUCTION
  return Delegated.implementation(dependencies, endpoints)
}

/**
 * The account implementation for app & verified Fission accounts.
 * This type of account can register apps.
 */
export function standard<FS>(
  dependencies: Dependencies<FS>,
  optionalEndpoints?: Fission.Endpoints
): Implementation<Standard.Annex> {
  const endpoints = optionalEndpoints || Fission.PRODUCTION
  return Standard.implementation(dependencies, endpoints)
}
