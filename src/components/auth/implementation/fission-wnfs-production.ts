import type { Components } from "../../../components.js"
import type { Dependencies } from "./base.js"
import type { Implementation } from "../implementation.js"

import * as FissionWnfs from "./fission-wnfs.js"
import * as FissionEndpoints from "../../../common/fission.js"


export function implementation(dependencies: Dependencies): Implementation<Components> {
  return FissionWnfs.implementation(FissionEndpoints.PRODUCTION, dependencies)
}