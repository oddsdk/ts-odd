import type { Channel, ChannelOptions } from "./channel"

import * as check from "../common/type-checks.js"
import { USERNAME_STORAGE_KEY } from "../common/index.js"
import { State } from "./state.js"
import { createAccount } from "../lobby/index.js"

import * as channel from "./channel.js"
import * as did from "../did/index.js"
import * as storage from "../storage/index.js"
import * as ucan from "../ucan/index.js"
import * as user from "../lobby/username.js"
import { LinkingError } from "./linking.js"
import RootTree from "../fs/root/tree"


export const init = async (): Promise<State | null> => {
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

  const readKey = await RootTree.retrieveRootKey()

  return { readKey, ucan: ucan.encode(u) }
}

function isLobbyLinkingData(data: unknown): data is { readKey: string; ucan: string } {
  return check.isObject(data)
    && "readKey" in data && typeof data.readKey === "string"
    && "ucan" in data && typeof data.ucan === "string"
}

export const linkDevice = async (data: Record<string, unknown>): Promise<void> => {
  if (!isLobbyLinkingData(data)) {
    throw new LinkingError(`Consumer received invalid link device response from producer: Expected read key and ucan, but got ${JSON.stringify(data)}`)
  }

  const u = ucan.decode(data.ucan)

  if (await ucan.isValid(u)) {
    await storage.setItem("ucan", data.ucan)
    await RootTree.storeRootKey(data.readKey)
  } else {
    throw new LinkingError(`Consumer received invalid link device response from producer. Given ucan is invalid: ${data.ucan}`)
  }
}



// 🛳


export const LOCAL_IMPLEMENTATION = {
  auth: {
    init,
    register,
    isUsernameValid,
    isUsernameAvailable,
    createChannel,
    checkCapability,
    delegateAccount,
    linkDevice
  }
}
