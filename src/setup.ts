import { Endpoints, setup as internalSetup, UserMessages } from "./setup/internal.js"

import { Implementation as AuthImplementation } from "./auth/implementation/types.js"
import { Implementation as CryptoImplementation } from "./crypto/implementation/types.js"
import { Implementation as StorageImplementation } from "./storage/implementation/types.js"

import * as authImpl from "./auth/implementation.js"
import * as cryptoImpl from "./crypto/implementation.js"
import * as storageImpl from "./storage/implementation.js"


/**
 * Toggle debug mode.
 *
 * Only adds a few `console.log`s at this moment.
 */
export function debug({ enabled }: { enabled: boolean }): boolean {
  internalSetup.debug = enabled
  return internalSetup.debug
}

/**
 * Configure whether webnative should aggressively pin
 * everything, or pin nothing at all.
 */
export function shouldPin({ enabled }: { enabled: boolean }): boolean {
  internalSetup.shouldPin = enabled
  return internalSetup.shouldPin
}

/**
 * Override endpoints.
 *
 * You can override each of these,
 * no need to provide them all here.
 *
 * `api` Location of the Fission API
 *       (default `https://runfission.com`)
 * `apiVersion` Vesion of the Fission API
 *       (defaults to the latest version)
 * `lobby` Location of the authentication lobby.
 *         (default `https://auth.fission.codes`)
 * `user`  User's domain to use, will be prefixed by username.
 *         (default `fission.name`)
 */
export function endpoints(e: Partial<Endpoints>): Endpoints {
  internalSetup.endpoints = { ...internalSetup.endpoints, ...e }
  return { ...internalSetup.endpoints }
}

/**
 * Set implementations.
 *
 * Override how auth, crypto or storage operates in webnative.
 */
export function setImplementations(opts: {
  auth?: Partial<AuthImplementation>
  crypto?: Partial<CryptoImplementation>
  storage?: Partial<StorageImplementation>
}) {
  if (opts.auth) authImpl.set(opts.auth)
  if (opts.crypto) cryptoImpl.set(opts.crypto)
  if (opts.storage) storageImpl.set(opts.storage)
}

/**
 * Configure messages that webnative sends to users.
 *
 * `versionMismatch.newer` is shown when webnative detects
 *  that the user's filesystem is newer than what this version of webnative supports.
 * `versionMismatch.older` is shown when webnative detects that the user's
 *  filesystem is older than what this version of webnative supports.
 */
export function userMessages(m: Partial<UserMessages>): UserMessages {
  internalSetup.userMessages = { ...internalSetup.userMessages, ...m }
  return { ...internalSetup.userMessages }
}
