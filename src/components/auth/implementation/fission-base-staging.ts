import { Dependents, Implementation } from "../implementation.js"
import * as FissionBase from "./fission-base.js"
import * as FissionEndpoints from "../../../common/fission.js"


export function implementation(dependents: Dependents): Implementation {
  return FissionBase.implementation(FissionEndpoints.STAGING, dependents)
}