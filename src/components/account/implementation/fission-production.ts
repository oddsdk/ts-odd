import { Implementation } from "../implementation.js"

import * as FissionEndpoints from "../../../common/fission.js"
import * as FissionBase from "./fission-base.js"

// 🛳

export { Annex } from "./fission-base.js"

export function implementation(dependencies: FissionBase.Dependencies): Implementation<FissionBase.Annex> {
  return FissionBase.implementation(FissionEndpoints.PRODUCTION, dependencies)
}
