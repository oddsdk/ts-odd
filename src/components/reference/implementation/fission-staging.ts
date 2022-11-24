import type { Dependencies } from "./base.js"
import type { Implementation } from "../implementation.js"

import * as FissionBase from "./fission-base.js"
import * as FissionEndpoints from "../../../common/fission.js"


export function implementation(dependencies: Dependencies): Promise<Implementation> {
  return FissionBase.implementation(FissionEndpoints.STAGING, dependencies)
}