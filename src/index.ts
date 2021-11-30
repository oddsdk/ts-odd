import localforage from "localforage"

import * as auth from "./auth/index.js"
import * as common from "./common/index.js"
import * as identifiers from "./common/identifiers.js"
import * as pathing from "./path.js"
import * as crypto from "./crypto/index.js"
import * as ucan from "./ucan/internal.js"
import * as ucanPermissions from "./ucan/permissions.js"

import { Maybe } from "./common/index.js"
import { Permissions } from "./ucan/permissions.js"
import { loadFileSystem } from "./filesystem.js"

import FileSystem from "./fs/index.js"


// SCENARIO


export enum Scenario {
  NotAuthorised = "NOT_AUTHORISED",
  AuthSucceeded = "AUTH_SUCCEEDED",
  AuthCancelled = "AUTH_CANCELLED",
  Continuation = "CONTINUATION"
}



// STATE


export type State
  = NotAuthorised
  | AuthSucceeded
  | AuthCancelled
  | Continuation

export type NotAuthorised = {
  scenario: Scenario.NotAuthorised
  permissions: Maybe<Permissions>

  authenticated: false
}

export type AuthSucceeded = {
  scenario: Scenario.AuthSucceeded
  permissions: Maybe<Permissions>

  authenticated: true
  newUser: boolean
  throughLobby: true
  username: string

  fs?: FileSystem
}

export type AuthCancelled = {
  scenario: Scenario.AuthCancelled
  permissions: Maybe<Permissions>

  authenticated: false
  cancellationReason: string
  throughLobby: true
}

export type Continuation = {
  scenario: Scenario.Continuation
  permissions: Maybe<Permissions>

  authenticated: true
  newUser: false
  throughLobby: false
  username: string

  fs?: FileSystem
}



// ERRORS


/**
 * Initialisation error
 */
export enum InitialisationError {
  InsecureContext = "INSECURE_CONTEXT",
  UnsupportedBrowser = "UNSUPPORTED_BROWSER"
}



// INTIALISE
export type InitOptions = {
  permissions?: Permissions

  // Options
  autoRemoveUrlParams?: boolean
  loadFileSystem?: boolean
  rootKey?: string
}

/**
 * Check if we're authenticated, process any lobby query-parameters present in the URL,
 * and initiate the user's file system if authenticated (can be disabled).
 *
 * See `loadFileSystem` if you want to load the user's file system yourself.
 * NOTE: Only works on the main/ui thread, as it uses `window.location`.
 */
export async function initialise(options: InitOptions): Promise<State> {
  options = options || {}

  const permissions = options.permissions || null
  const { rootKey } = options

  const maybeLoadFs = async (username: string): Promise<undefined | FileSystem> => {
    return options.loadFileSystem === false
      ? undefined
      : await loadFileSystem(permissions, username, rootKey)
  }

  // Check if browser is supported
  if (globalThis.isSecureContext === false) throw InitialisationError.InsecureContext
  if (await isSupported() === false) throw InitialisationError.UnsupportedBrowser

  const state = await auth.init(options)
  // Allow auth implementation to return a State directly
  if (state) {
    return state
  }

  const authedUsername = await common.authenticatedUsername()

  if (authedUsername && permissions) {
    const validSecrets = await validateSecrets(permissions)
    const validUcans = ucan.validatePermissions(permissions, authedUsername)

    if (validSecrets && validUcans) {
      return scenarioContinuation(permissions, authedUsername, await maybeLoadFs(authedUsername))
    } else {
      return scenarioNotAuthorised(permissions)
    }

  } else if (authedUsername) {
    return scenarioContinuation(permissions, authedUsername, await maybeLoadFs(authedUsername))

  } else {
    return scenarioNotAuthorised(permissions)

  }
}


/**
 * Alias for `initialise`.
 */
export { initialise as initialize }



// SUPPORTED


export async function isSupported(): Promise<boolean> {
  return localforage.supports(localforage.INDEXEDDB)

    // Firefox in private mode can't use indexedDB properly,
    // so we test if we can actually make a database.
    && await (() => new Promise(resolve => {
      const db = indexedDB.open("testDatabase")
      db.onsuccess = () => resolve(true)
      db.onerror = () => resolve(false)
    }))() as boolean
}



// EXPORT


export * from "./auth.js"
export * from "./filesystem.js"
export * from "./common/version.js"

export const fs = FileSystem

export * as apps from "./apps/index.js"
export * as dataRoot from "./data-root.js"
export * as did from "./did/index.js"
export * as errors from "./errors.js"
export * as lobby from "./lobby/index.js"
export * as path from "./path.js"
export * as setup from "./setup.js"
export * as ucan from "./ucan/index.js"

export * as dns from "./dns/index.js"
export * as ipfs from "./ipfs/index.js"
export * as keystore from "./keystore.js"
export * as machinery from "./common/index.js"
export * as crypto from "./crypto/index.js"
export * as cbor from "cborg"



// ㊙️  ⚛  SCENARIOS


export function scenarioAuthSucceeded(
  permissions: Maybe<Permissions>,
  newUser: boolean,
  username: string,
  fs: FileSystem | undefined
): AuthSucceeded {
  return {
    scenario: Scenario.AuthSucceeded,
    permissions,

    authenticated: true,
    throughLobby: true,
    fs,
    newUser,
    username
  }
}

export function scenarioAuthCancelled(
  permissions: Maybe<Permissions>,
  cancellationReason: string
): AuthCancelled {
  return {
    scenario: Scenario.AuthCancelled,
    permissions,

    authenticated: false,
    throughLobby: true,
    cancellationReason
  }
}

export function scenarioContinuation(
  permissions: Maybe<Permissions>,
  username: string,
  fs: FileSystem | undefined
): Continuation {
  return {
    scenario: Scenario.Continuation,
    permissions,

    authenticated: true,
    newUser: false,
    throughLobby: false,
    fs,
    username
  }
}

export function scenarioNotAuthorised(
  permissions: Maybe<Permissions>
): NotAuthorised {
  return {
    scenario: Scenario.NotAuthorised,
    permissions,

    authenticated: false
  }
}


export async function validateSecrets(permissions: Permissions): Promise<boolean> {
  return ucanPermissions.paths(permissions).reduce(
    (acc, path) => acc.then(async bool => {
      if (bool === false) return bool
      if (pathing.isBranch(pathing.Branch.Public, path)) return bool

      const keyName = await identifiers.readKey({ path })
      return await crypto.keystore.keyExists(keyName)
    }),
    Promise.resolve(true)
  )
}
