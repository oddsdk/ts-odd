import { USERNAME_STORAGE_KEY } from "../common/index.js"
import { State } from "./state.js"
import { createAccount } from "../lobby/index.js"
import * as user from "../lobby/username.js"
import * as storage from "../storage/index.js"
import * as did from "../did/index.js"
import * as ucan from "../ucan/index.js"
import * as channel from "./channel.js"

import type { Channel, ChannelOptions } from "./channel"

export const init = async (): Promise<State | null> => {
  console.log("initialize local auth")
  return new Promise((resolve) => resolve(null))
}

export const register = async (options: { username: string; email: string }): Promise<{ success: boolean }> => {
  const { success } = await createAccount(options)

  if (success) {
    await storage.setItem(USERNAME_STORAGE_KEY, options.username)
    return { success: true }
  }
  return { success: false }
}

export const isUsernameValid = async (username: string): Promise<boolean> => {
  return user.isUsernameValid(username)
}

export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  return user.isUsernameAvailable(username)
}

export const createChannel = (options: ChannelOptions): Promise<Channel> => {
  return channel.createChannel(options)
}

export const delegateAccount = async (audience: string): Promise<Record<string, unknown>> => {
  console.log("Audience in user code", audience)

  // Proof
  const proof = await storage.getItem("ucan") as string

  // UCAN
  const u = await ucan.build({
    audience,
    issuer: await did.write(),
    lifetimeInSeconds: 60 * 60 * 24 * 30 * 12 * 1000, // 1000 years
    potency: "SUPER_USER",
    proof,

    // TODO: UCAN v0.7.0
    // proofs: [ await localforage.getItem("ucan") ]
  })

  return { token: ucan.encode(u) }
}

export const linkDevice = async (data: Record<string, unknown>): Promise<null> => {
  const { token } = data
  const u = ucan.decode(token as string)

  if (await ucan.isValid(u)) {
    await storage.setItem("ucan", token)
  }

  return null
}

export const LOCAL_IMPLEMENTATION = {
  auth: {
    init,
    register,
    isUsernameValid,
    isUsernameAvailable,
    createChannel,
    delegateAccount,
    linkDevice
  }
}
