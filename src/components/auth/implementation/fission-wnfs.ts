import type { Components } from "../../../components.js"
import type { Dependencies } from "./base.js"
import type { Implementation } from "../implementation.js"

import * as Fission from "./fission/index.js"
import * as FissionBase from "./fission-base.js"
import * as Wnfs from "./wnfs.js"


// 🛳


export function implementation(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies
): Implementation<Components> {
  const fissionBase = FissionBase.implementation(endpoints, dependencies)
  const wnfs = Wnfs.implementation(dependencies)

  return {
    type: wnfs.type,

    canDelegateAccount: wnfs.canDelegateAccount,
    delegateAccount: wnfs.delegateAccount,
    linkDevice: wnfs.linkDevice,
    session: wnfs.session,

    createChannel: fissionBase.createChannel,
    isUsernameValid: fissionBase.isUsernameValid,
    isUsernameAvailable: fissionBase.isUsernameAvailable,
    register: fissionBase.register,
  }
}