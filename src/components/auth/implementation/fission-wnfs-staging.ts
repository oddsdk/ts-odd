import { Dependents, Implementation } from "../implementation.js"
import * as FissionWNFS from "./fission-wnfs.js"
import * as FissionEndpoints from "../../../common/fission.js"


export function implementation(dependents: Dependents): Implementation {
  return FissionWNFS.implementation(FissionEndpoints.STAGING, dependents)
}