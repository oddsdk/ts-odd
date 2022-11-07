import type { Dependents } from "./base.js"
import type { Implementation } from "../implementation.js"

import * as FissionBase from "./fission-base.js"
import * as FissionEndpoints from "../../../common/fission.js"


export function implementation(dependents: Dependents): Implementation {
  return FissionBase.implementation(FissionEndpoints.PRODUCTION, dependents)
}