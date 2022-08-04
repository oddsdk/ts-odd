import type { Channel, ChannelOptions } from "../channel.js"

import { USERNAME_STORAGE_KEY } from "../../common/index.js"
import { AppState } from "../state/app.js"
import { createAccount } from "../../lobby/index.js"
import { toInternalUsername } from "../username.js"

import * as channel from "../channel.js"
import * as did from "../../did/index.js"
import * as storage from "../../storage/index.js"
import * as ucan from "../../ucan/index.js"
import * as user from "../../lobby/username.js"


export const init = async (): Promise<AppState | null> => {
  return new Promise((resolve) => resolve(null))
}

export const register = async (options: { username: string; email?: string }): Promise<{ success: boolean }> => {
  const internalUserame = await toInternalUsername(options.username)

  const { success } = await createAccount({
    username: internalUserame,
    email: options.email
  })

  if (success) {
    await storage.setItem(USERNAME_STORAGE_KEY, options.username)
    return { success: true }
  }
  return { success: false }
}

export const transformUsername = (username: string): { username: string; hash: boolean } => {
  return { username, hash: false }
}

export const isUsernameValid = async (username: string): Promise<boolean> => {
  return user.isUsernameValid(username)
}

export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  return user.isUsernameAvailable(username)
}

export const createChannel = (options: ChannelOptions): Promise<Channel> => {
  return channel.createWssChannel(options)
}

export const checkCapability = async (username: string): Promise<boolean> => {
  const didFromDNS = await did.root(username)
  const maybeUcan: string | null = await storage.getItem("ucan")

  if (maybeUcan) {
    const rootIssuerDid = ucan.rootIssuer(maybeUcan)
    const decodedUcan = ucan.decode(maybeUcan)
    const { ptc } = decodedUcan.payload

    return didFromDNS === rootIssuerDid && ptc === "SUPER_USER"
  } else {
    const rootDid = await did.write()

    return didFromDNS === rootDid
  }
}

export const delegateAccount = async (username: string, audience: string): Promise<Record<string, unknown>> => {
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

export const linkDevice = async (data: Record<string, unknown>): Promise<void> => {
  const { token } = data
  const u = ucan.decode(token as string)

  if (await ucan.isValid(u)) {
    await storage.setItem("ucan", token)
  }
}



// 🛳


export const BASE_IMPLEMENTATION = {
  auth: {
    init,
    register,
    isUsernameValid,
    isUsernameAvailable,
    transformUsername,
    createChannel,
    checkCapability,
    delegateAccount,
    linkDevice
  }
}
