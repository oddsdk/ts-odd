import * as Crypto from "../../crypto/implementation.js"
import * as Reference from "../../reference/implementation.js"
import * as Storage from "../../storage/implementation.js"

import * as Did from "../../../did/index.js"
import * as SessionMod from "../../../session.js"
import * as Ucan from "../../../ucan/index.js"

import { Components } from "../../../components.js"
import { Configuration } from "../../../configuration.js"
import { Implementation } from "../implementation.js"
import { Maybe } from "../../../common/types.js"
import { Session } from "../../../session.js"


// 🏔


export const TYPE = "webCrypto"


export type Dependents = {
  crypto: Crypto.Implementation,
  reference: Reference.Implementation
  storage: Storage.Implementation
}



// 🛠


export async function activate(
  components: Components,
  authedUsername: Maybe<string>,
  config: Configuration
): Promise<Maybe<Session>> {
  if (authedUsername) {
    return new Session({
      crypto: components.crypto,
      storage: components.storage,
      type: TYPE,
      username: authedUsername
    })

  } else {
    return null

  }
}

export async function canDelegateAccount(
  dependents: Dependents,
  username: string
): Promise<boolean> {
  const didFromDNS = await dependents.reference.didRoot.lookup(username)
  const maybeUcan: string | null = await dependents.storage.getItem(dependents.storage.KEYS.ACCOUNT_UCAN)

  if (maybeUcan) {
    const rootIssuerDid = Ucan.rootIssuer(maybeUcan)
    const decodedUcan = Ucan.decode(maybeUcan)
    const { ptc } = decodedUcan.payload

    return didFromDNS === rootIssuerDid && ptc === "SUPER_USER"
  } else {
    const rootDid = await Did.write(dependents.crypto)

    return didFromDNS === rootDid
  }
}

export async function delegateAccount(
  dependents: Dependents,
  username: string,
  audience: string
): Promise<Record<string, unknown>> {
  const proof: string | undefined = await dependents.storage.getItem(
    dependents.storage.KEYS.ACCOUNT_UCAN
  ) || undefined

  // UCAN
  const u = await Ucan.build({
    dependents,

    audience,
    issuer: await Did.write(dependents.crypto),
    lifetimeInSeconds: 60 * 60 * 24 * 30 * 12 * 1000, // 1000 years
    potency: "SUPER_USER",
    proof,

    // TODO: UCAN v0.7.0
    // proofs: [ await localforage.getItem(dependents.storage.KEYS.ACCOUNT_UCAN) ]
  })

  return { token: Ucan.encode(u) }
}

export async function linkDevice(
  dependents: Dependents,
  username: string,
  data: Record<string, unknown>
): Promise<void> {
  const { token } = data
  const u = Ucan.decode(token as string)

  if (await Ucan.isValid(dependents.crypto, u)) {
    await dependents.storage.setItem(dependents.storage.KEYS.ACCOUNT_UCAN, token)
    await SessionMod.provide(dependents.storage, { type: TYPE, username })
  }
}



// 🛳


export function implementation(dependents: Dependents): Implementation<Components> {
  return {
    type: TYPE,

    activate: activate,
    canDelegateAccount: (...args) => canDelegateAccount(dependents, ...args),
    createChannel: () => { throw new Error("Not implemented") },
    delegateAccount: (...args) => delegateAccount(dependents, ...args),
    linkDevice: (...args) => linkDevice(dependents, ...args),

    // Have to be implemented properly by other implementations
    isUsernameValid: () => Promise.resolve(false),
    isUsernameAvailable: () => Promise.resolve(false),
    register: () => Promise.resolve({ success: false })
  }
}