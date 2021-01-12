import localforage from 'localforage'

import * as common from './common'
import * as keystore from './keystore'
import * as ucan from './ucan/internal'

import { READ_KEY_FROM_LOBBY_NAME, USERNAME_STORAGE_KEY, Maybe } from './common'
import { Permissions } from './ucan/permissions'
import { loadFileSystem } from './filesystem'

import FileSystem from './fs'
import fsClass from './fs'


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
  newUser: false,
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


/**
 * Check if we're authenticated, process any lobby query-parameters present in the URL,
 * and initiate the user's file system if authenticated (can be disabled).
 *
 * See `loadFileSystem` if you want to load the user's file system yourself.
 * NOTE: Only works on the main/ui thread, as it uses `window.location`.
 */
export async function initialise(
  options: {
    permissions?: Permissions

    // Options
    autoRemoveUrlParams?: boolean
    loadFileSystem?: boolean
  }
): Promise<State> {
  options = options || {}

  const permissions = options.permissions || null
  const { autoRemoveUrlParams = true } = options
  const { app, fs } = permissions || {}

  const maybeLoadFs = async (username: string): Promise<undefined | FileSystem> => {
    return options.loadFileSystem === false
      ? undefined
      : await loadFileSystem(permissions, username)
  }

  // Check if browser is supported
  if (globalThis.isSecureContext === false) throw InitialisationError.InsecureContext
  if (await isSupported() === false) throw InitialisationError.UnsupportedBrowser

  // URL things
  const url = new URL(window.location.href)
  const cancellation = url.searchParams.get("cancelled")
  const ucans = url.searchParams.get("ucans")

  // Add UCANs to the storage
  await ucan.store(ucans ? ucans.split(",") : [])

  // Determine scenario
  if (ucans) {
    const newUser = url.searchParams.get("newUser") === "t"
    const encryptedReadKey = url.searchParams.get("readKey") || ""
    const username = url.searchParams.get("username") || ""

    const ks = await keystore.get()
    const readKey = await ks.decrypt(common.base64.makeUrlUnsafe(encryptedReadKey))
    await ks.importSymmKey(readKey, READ_KEY_FROM_LOBBY_NAME)
    await localforage.setItem(USERNAME_STORAGE_KEY, username)

    if (autoRemoveUrlParams) {
      url.searchParams.delete("newUser")
      url.searchParams.delete("readKey")
      url.searchParams.delete("ucans")
      url.searchParams.delete("username")
      history.replaceState(null, document.title, url.toString())
    }

    if (permissions && ucan.validatePermissions(permissions, username) === false) {
      return scenarioNotAuthorised(permissions)
    }

    return scenarioAuthSucceeded(
      permissions,
      newUser,
      username,
      await maybeLoadFs(username)
    )

  } else if (cancellation) {
    const c = (_ => { switch (cancellation) {
      case "DENIED": return "User denied authorisation"
      default: return "Unknown reason"
    }})()

    return scenarioAuthCancelled(permissions, c)

  }

  const authedUsername = await common.authenticatedUsername()

  return (
    authedUsername &&
    (permissions ? ucan.validatePermissions(permissions, authedUsername) : true)
  )
  ? scenarioContinuation(permissions, authedUsername, await maybeLoadFs(authedUsername))
  : scenarioNotAuthorised(permissions)
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


export * from './auth'
export * from './filesystem'

export const fs = fsClass

export * as apps from './apps'
export * as dataRoot from './data-root'
export * as did from './did'
export * as errors from './errors'
export * as lobby from './lobby'
export * as setup from './setup'
export * as ucan from './ucan'

export * as dns from './dns'
export * as ipfs from './ipfs'
export * as keystore from './keystore'



// ㊙️  ⚛  SCENARIOS


function scenarioAuthSucceeded(
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

function scenarioAuthCancelled(
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

function scenarioContinuation(
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

function scenarioNotAuthorised(
  permissions: Maybe<Permissions>
): NotAuthorised {
  return {
    scenario: Scenario.NotAuthorised,
    permissions,

    authenticated: false
  }
}
