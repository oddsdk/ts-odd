import { USERNAME_STORAGE_KEY } from "../common/index.js"
import { State } from "./state.js"
import { createAccount } from "../lobby/index.js"
import * as user from "../lobby/username.js"
import * as storage from "../storage/index.js"
import * as channel from "./channel.js"
import * as did from "../did/index.js"
import * as linking from "./linking/switch.js"
import * as ucan from "../ucan/index.js"
import type { Msg } from "keystore-idb/lib/types.js"

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

export const openChannel = async (did: string): Promise<void> => {
  return channel.openWssChannel(did, linking.handleMessage)
}

export const closeChannel = async (): Promise<void> => {
  return channel.closeWssChannel()
}

export const publishOnChannel = async (data: any): Promise<void> => {
  return channel.publishOnWssChannel(data)
}

export const delegateAccount = async (audience: string): Promise<Msg> => {
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

  return ucan.encode(u)
}

export const linkDevice = async (u: any): Promise<null> => {
  await storage.setItem("ucan", u)

  return null
}

export const LOCAL_IMPLEMENTATION = {
  auth: {
    init,
    register,
    isUsernameValid,
    isUsernameAvailable,
    openChannel,
    closeChannel,
    delegateAccount,
    linkDevice
  }
}
