import { Dependents, Implementation } from "../implementation.js"
import * as FissionLobby from "./fission-lobby.js"
import * as Fission from "../../../common/fission.js"


// 🛳


export function implementation(
  dependents: Dependents
): Implementation {
  return FissionLobby.implementation(
    Fission.STAGING,
    dependents
  )
}