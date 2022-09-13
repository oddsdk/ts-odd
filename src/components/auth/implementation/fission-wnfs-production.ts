import { Dependents, Implementation } from "../implementation.js"
import * as FissionLobby from "./fission-lobby.js"
import * as FissionEndpoints from "../../../common/fission.js"


export function implementation(dependents: Dependents): Implementation {
  return FissionLobby.implementation(FissionEndpoints.PRODUCTION, dependents)
}