import * as Crypto from "../../crypto/implementation.js"
import * as Reference from "../../reference/implementation.js"
import * as Storage from "../../storage/implementation.js"

import * as Did from "../../../did/index.js"
import * as Events from "../../../events.js"
import * as SessionMod from "../../../session.js"
import * as Ucan from "../../../ucan/index.js"

import { Components } from "../../../components.js"
import { Configuration } from "../../../configuration.js"
import { Implementation } from "../implementation.js"
import { Maybe } from "../../../common/types.js"
import { Session } from "../../../session.js"


// 🏔


export const TYPE = "webCrypto"


export type Dependencies = {
  crypto: Crypto.Implementation
  reference: Reference.Implementation
  storage: Storage.Implementation
}



// 🛠


export async function canDelegateAccount(
  dependencies: Dependencies,
  username: string
): Promise<boolean> {
  const didFromDNS = await dependencies.reference.didRoot.lookup(username)
  const maybeUcan: string | null = await dependencies.storage.getItem(dependencies.storage.KEYS.ACCOUNT_UCAN)

  if (maybeUcan) {
    const rootIssuerDid = Ucan.rootIssuer(maybeUcan)
    const decodedUcan = Ucan.decode(maybeUcan)
    const { ptc } = decodedUcan.payload

    return didFromDNS === rootIssuerDid && ptc === "SUPER_USER"
  } else {
    const rootDid = await Did.write(dependencies.crypto)

    return didFromDNS === rootDid
  }
}

export async function delegateAccount(
  dependencies: Dependencies,
  username: string,
  audience: string
): Promise<Record<string, unknown>> {
  const proof: string | undefined = await dependencies.storage.getItem(
    dependencies.storage.KEYS.ACCOUNT_UCAN
  ) ?? undefined

  // UCAN
  const u = await Ucan.build({
    dependencies,

    audience,
    issuer: await Did.write(dependencies.crypto),
    lifetimeInSeconds: 60 * 60 * 24 * 30 * 12 * 1000, // 1000 years
    potency: "SUPER_USER",
    proof,

    // TODO: UCAN v0.7.0
    // proofs: [ await localforage.getItem(dependencies.storage.KEYS.ACCOUNT_UCAN) ]
  })

  return { token: Ucan.encode(u) }
}

export async function linkDevice(
  dependencies: Dependencies,
  username: string,
  data: Record<string, unknown>
): Promise<void> {
  const { token } = data
  const u = Ucan.decode(token as string)

  if (await Ucan.isValid(dependencies.crypto, u)) {
    await dependencies.storage.setItem(dependencies.storage.KEYS.ACCOUNT_UCAN, token)
    await SessionMod.provide(dependencies.storage, { type: TYPE, username })
  }
}

/**
 * Doesn't quite register an account yet,
 * needs to be implemented properly by other implementations.
 *
 * NOTE: This base function should be called by other implementations,
 *       because it's the foundation for sessions.
 */
export async function register(
  dependencies: Dependencies,
  options: { username: string; email?: string; type?: string }
): Promise<{ success: boolean }> {
  await SessionMod.provide(dependencies.storage, { type: options.type || TYPE, username: options.username })
  return { success: true }
}

export async function session(
  components: Components,
  authedUsername: Maybe<string>,
  config: Configuration,
  eventEmitters: { session: Events.Emitter<Events.Session<Session>> }
): Promise<Maybe<Session>> {
  if (authedUsername) {
    const session = new Session({
      crypto: components.crypto,
      storage: components.storage,
      eventEmitter: eventEmitters.session,
      type: TYPE,
      username: authedUsername
    })

    return session

  } else {
    return null

  }
}



// 🛳


export function implementation(dependencies: Dependencies): Implementation<Components> {
  return {
    type: TYPE,

    canDelegateAccount: (...args) => canDelegateAccount(dependencies, ...args),
    delegateAccount: (...args) => delegateAccount(dependencies, ...args),
    linkDevice: (...args) => linkDevice(dependencies, ...args),
    register: (...args) => register(dependencies, ...args),
    session: session,

    // Have to be implemented properly by other implementations
    createChannel: () => { throw new Error("Not implemented") },
    isUsernameValid: () => { throw new Error("Not implemented") },
    isUsernameAvailable: () => { throw new Error("Not implemented") },
  }
}