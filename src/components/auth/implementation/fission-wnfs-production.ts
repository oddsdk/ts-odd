import { Dependents, Implementation } from "../implementation.js"
import * as FissionWnfs from "./fission-wnfs.js"
import * as FissionEndpoints from "../../../common/fission.js"


export function implementation(dependents: Dependents): Implementation {
  return FissionWnfs.implementation(FissionEndpoints.PRODUCTION, dependents)
}