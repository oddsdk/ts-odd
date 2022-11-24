import type { Components } from "../../../components.js"
import type { Dependencies } from "./base.js"
import type { Channel, ChannelOptions } from "../channel.js"
import type { Implementation } from "../implementation.js"

import * as Base from "./base.js"
import * as ChannelFission from "./fission/channel.js"
import * as ChannelMod from "../channel.js"
import * as Fission from "./fission/index.js"


export function createChannel(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies,
  options: ChannelOptions
): Promise<Channel> {
  return ChannelMod.createWssChannel(
    dependencies.reference,
    ChannelFission.endpoint(
      `${endpoints.server}${endpoints.apiPath}`.replace(/^https?:\/\//, "wss://")
    ),
    options
  )
}

export const isUsernameAvailable = async (endpoints: Fission.Endpoints, username: string): Promise<boolean> => {
  return Fission.isUsernameAvailable(endpoints, username)
}

export const isUsernameValid = async (username: string): Promise<boolean> => {
  return Fission.isUsernameValid(username)
}

export const register = async (
  endpoints: Fission.Endpoints,
  dependencies: Dependencies,
  options: { username: string; email?: string }
): Promise<{ success: boolean }> => {
  const { success } = await Fission.createAccount(endpoints, dependencies, options)
  if (success) return Base.register(dependencies, { ...options, type: Base.TYPE })
  return { success: false }
}



// 🛳


export function implementation(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies
): Implementation<Components> {
  const base = Base.implementation(dependencies)

  return {
    type: base.type,

    canDelegateAccount: base.canDelegateAccount,
    delegateAccount: base.delegateAccount,
    linkDevice: base.linkDevice,
    session: base.session,

    isUsernameValid,

    createChannel: (...args) => createChannel(endpoints, dependencies, ...args),
    isUsernameAvailable: (...args) => isUsernameAvailable(endpoints, ...args),
    register: (...args) => register(endpoints, dependencies, ...args)
  }
}
