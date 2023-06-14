import { Implementation } from "../implementation.js"

import * as FissionEndpoints from "../../../common/fission.js"
import * as FissionBase from "./fission-base.js"


// 🛳


export function implementation(): Implementation {
  return FissionBase.implementation(FissionEndpoints.STAGING)
}