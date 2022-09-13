import type { Implementation, Dependents } from "../implementation.js"

import * as Fission from "./fission/index.js"
import * as FissionBase from "./fission-base.js"
import * as Wnfs from "./wnfs.js"


// 🛳


export function implementation(
  endpoints: Fission.Endpoints,
  dependents: Dependents
): Implementation {
  const fissionBase = FissionBase.implementation(endpoints, dependents)
  const wnfs = Wnfs.implementation(dependents)

  return {
    type: wnfs.type,

    activate: wnfs.activate,
    canDelegateAccount: wnfs.canDelegateAccount,
    createChannel: wnfs.createChannel,
    delegateAccount: wnfs.delegateAccount,
    linkDevice: wnfs.linkDevice,

    isUsernameValid: fissionBase.isUsernameValid,
    isUsernameAvailable: fissionBase.isUsernameAvailable,
    register: fissionBase.register,
  }
}