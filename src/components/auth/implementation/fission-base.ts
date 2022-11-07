import type { Components } from "../../../components.js"
import type { Dependents } from "./base.js"
import type { Channel, ChannelOptions } from "../channel.js"
import type { Implementation } from "../implementation.js"

import * as Base from "./base.js"
import * as ChannelFission from "./fission/channel.js"
import * as ChannelMod from "../channel.js"
import * as Fission from "./fission/index.js"
import * as Session from "../../../session.js"


export function createChannel(
  endpoints: Fission.Endpoints,
  dependents: Dependents,
  options: ChannelOptions
): Promise<Channel> {
  return ChannelMod.createWssChannel(
    dependents.reference,
    ChannelFission.endpoint(
      `${endpoints.server}/${endpoints.apiPath}`.replace(/^https?:\/\//, "wss://")
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
  dependents: Dependents,
  options: { username: string; email?: string }
): Promise<{ success: boolean }> => {
  const { success } = await Fission.createAccount(endpoints, dependents, options)

  if (success) {
    await Session.provide(dependents.storage, { type: Base.TYPE, username: options.username })

    return { success: true }
  }

  return { success: false }
}



// 🛳


export function implementation(
  endpoints: Fission.Endpoints,
  dependents: Dependents
): Implementation<Components> {
  const base = Base.implementation(dependents)

  return {
    type: base.type,

    activate: base.activate,
    canDelegateAccount: base.canDelegateAccount,
    delegateAccount: base.delegateAccount,
    linkDevice: base.linkDevice,

    isUsernameValid,

    createChannel: (...args) => createChannel(endpoints, dependents, ...args),
    isUsernameAvailable: (...args) => isUsernameAvailable(endpoints, ...args),
    register: (...args) => register(endpoints, dependents, ...args)
  }
}
