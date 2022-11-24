import type { Components } from "../../../components.js"
import type { Dependencies } from "./base.js"
import type { Implementation } from "../implementation.js"

import * as FissionBase from "./fission-base.js"
import * as FissionEndpoints from "../../../common/fission.js"


export function implementation(dependencies: Dependencies): Implementation<Components> {
  return FissionBase.implementation(FissionEndpoints.PRODUCTION, dependencies)
}