import * as Uint8arrays from "uint8arrays"

import type { Components } from "../../../components.js"
import type { Dependents } from "./base.js"
import type { Implementation } from "../implementation.js"

import * as Base from "./base.js"
import * as DID from "../../../did/index.js"
import * as RootKey from "../../../common/root-key.js"
import * as SessionMod from "../../../session.js"
import * as TypeChecks from "../../../common/type-checks.js"
import * as Ucan from "../../../ucan/index.js"

import { Configuration } from "../../../configuration.js"
import { LinkingError } from "../../../linking/common.js"
import { Maybe } from "../../../common/types.js"
import { Session } from "../../../session.js"
import { loadRootFileSystem } from "../../../filesystem.js"


export async function activate(
  components: Components,
  authedUsername: Maybe<string>,
  config: Configuration
): Promise<Maybe<Session>> {
  if (authedUsername) {
    // Self-authorize a filesystem UCAN if needed
    const hasSelfAuthorisedFsUcan = components.reference.repositories.ucans.find(
      ucan => {
        // 🛑 If the UCAN expires within a week
        if (ucan.payload.exp < (Date.now() + 60 * 60 * 24 * 7)) return false

        // Check potency and resource
        return ucan.payload.ptc === "APPEND" && ucan.payload.rsc === "*"
      }
    )

    if (!hasSelfAuthorisedFsUcan) {
      const issuer = await DID.write(components.crypto)
      const proof: string | null = await components.storage.getItem(
        components.storage.KEYS.ACCOUNT_UCAN
      )

      const fsUcan = await Ucan.build({
        dependents: components,
        potency: "APPEND",
        resource: "*",
        proof: proof ? proof : undefined,
        lifetimeInSeconds: 60 * 60 * 24 * 30 * 12 * 1000, // 1000 years

        audience: issuer,
        issuer
      })

      await components.reference.repositories.ucans.add(fsUcan)
    }

    // Load filesystem
    const fs = config.fileSystem?.loadImmediately === false ?
      undefined :
      await loadRootFileSystem({
        config,
        dependents: {
          crypto: components.crypto,
          depot: components.depot,
          manners: components.manners,
          reference: components.reference,
          storage: components.storage,
        },
        username: authedUsername,
      })

    // Fin
    return new Session({
      crypto: components.crypto,
      fs: fs,
      storage: components.storage,
      type: Base.TYPE,
      username: authedUsername
    })
  }

  return null
}

export async function canDelegateAccount(
  dependents: Dependents,
  username: string
): Promise<boolean> {
  const accountDID = await rootDID(dependents)
  const readKey = await RootKey.retrieve({ crypto: dependents.crypto, accountDID })
  if (!readKey) return false

  return Base.canDelegateAccount(dependents, username)
}

export async function delegateAccount(
  dependents: Dependents,
  username: string,
  audience: string
): Promise<Record<string, unknown>> {
  const accountDID = await rootDID(dependents)
  const readKey = await RootKey.retrieve({ crypto: dependents.crypto, accountDID })
  const { token } = await Base.delegateAccount(dependents, username, audience)
  return { readKey: Uint8arrays.toString(readKey, "base64pad"), ucan: token }
}

export async function linkDevice(
  dependents: Dependents,
  username: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!isWnfsLinkingData(data)) {
    throw new LinkingError(`Consumer received invalid link device response from producer: Expected read key and ucan, but got ${JSON.stringify(data)}`)
  }

  const { readKey, ucan: encodedToken } = data
  const ucan = Ucan.decode(encodedToken as string)

  if (await Ucan.isValid(dependents.crypto, ucan)) {
    await dependents.storage.setItem(dependents.storage.KEYS.ACCOUNT_UCAN, encodedToken)

    await RootKey.store({
      accountDID: await rootDID(dependents),
      crypto: dependents.crypto,
      readKey: RootKey.fromString(readKey)
    })

    // Create and store filesystem UCAN
    const issuer = await DID.write(dependents.crypto)
    const fsUcan = await Ucan.build({
      dependents: dependents,
      potency: "APPEND",
      resource: "*",
      proof: encodedToken,
      lifetimeInSeconds: 60 * 60 * 24 * 30 * 12 * 1000, // 1000 years

      audience: issuer,
      issuer
    })

    await dependents.reference.repositories.ucans.add(fsUcan)

  } else {
    throw new LinkingError(`Consumer received invalid link device response from producer. Given ucan is invalid: ${data.ucan}`)

  }

  await SessionMod.provide(dependents.storage, { type: Base.TYPE, username })
}



// 🛠


export function isWnfsLinkingData(data: unknown): data is { readKey: string; ucan: string } {
  return TypeChecks.isObject(data)
    && "readKey" in data && typeof data.readKey === "string"
    && "ucan" in data && typeof data.ucan === "string"
}


export async function rootDID(dependents: Dependents): Promise<string> {
  const maybeUcan: string | null = await dependents.storage.getItem(dependents.storage.KEYS.ACCOUNT_UCAN)
  return maybeUcan ? Ucan.rootIssuer(maybeUcan) : await DID.write(dependents.crypto)
}



// 🛳


export function implementation(
  dependents: Dependents
): Implementation<Components> {
  const base = Base.implementation(dependents)

  return {
    type: base.type,

    activate,

    canDelegateAccount: (...args) => canDelegateAccount(dependents, ...args),
    delegateAccount: (...args) => delegateAccount(dependents, ...args),
    linkDevice: (...args) => linkDevice(dependents, ...args),

    // Have to be implemented properly by other implementations
    createChannel: base.createChannel,
    isUsernameValid: base.isUsernameValid,
    isUsernameAvailable: base.isUsernameAvailable,
    register: base.register,
  }
}