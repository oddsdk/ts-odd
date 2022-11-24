import type { Dependencies } from "./fission-lobby.js"
import type { Implementation } from "../implementation.js"

import * as FissionLobby from "./fission-lobby.js"
import * as Fission from "../../../common/fission.js"


// 🛳


export function implementation(
  dependencies: Dependencies
): Implementation {
  return FissionLobby.implementation(
    Fission.PRODUCTION,
    dependencies
  )
}