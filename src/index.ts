import { CharSize } from 'keystore-idb/types'
import localforage from 'localforage'
import utils from 'keystore-idb/utils'

import * as common from './common'
import * as identifiers from './common/identifiers'
import * as ipfs from './ipfs'
import * as keystore from './keystore'
import * as ucan from './ucan/internal'
import * as ucanPermissions from './ucan/permissions'

import { USERNAME_STORAGE_KEY, Maybe } from './common'
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
    rootKey?: string
  }
): Promise<State> {
  options = options || {}

  const permissions = options.permissions || null
  const { autoRemoveUrlParams = true, rootKey } = options
  const { app, fs } = permissions || {}

  const maybeLoadFs = async (username: string): Promise<undefined | FileSystem> => {
    return options.loadFileSystem === false
      ? undefined
      : await loadFileSystem(permissions, username, rootKey)
  }

  // Check if browser is supported
  if (globalThis.isSecureContext === false) throw InitialisationError.InsecureContext
  if (await isSupported() === false) throw InitialisationError.UnsupportedBrowser

  // URL things
  const url = new URL(window.location.href)
  const authorised = url.searchParams.get("authorised")
  const cancellation = url.searchParams.get("cancelled")

  // Determine scenario
  if (authorised) {
    const newUser = url.searchParams.get("newUser") === "t"
    const username = url.searchParams.get("username") || ""

    await importClassifiedInfo(authorised)
    await localforage.setItem(USERNAME_STORAGE_KEY, username)

    if (autoRemoveUrlParams) {
      url.searchParams.delete("authorised")
      url.searchParams.delete("newUser")
      url.searchParams.delete("username")
      history.replaceState(null, document.title, url.toString())
    }

    if (permissions && await validateSecrets(permissions) === false) {
      console.warn("Unable to validate filesystem secrets")
      return scenarioNotAuthorised(permissions)
    }

    if (permissions && ucan.validatePermissions(permissions, username) === false) {
      console.warn("Unable to validate UCAN permissions")
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

  } else {
    // trigger build for internal ucan dictionary
    ucan.store([])

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



// ㊙️


async function importClassifiedInfo(
  cid: string
): Promise<void> {
  const ks = await keystore.get()
  const info = JSON.parse(await ipfs.cat(cid))

  // Extract session key and its iv
  const iv = utils.base64ToArrBuf(info.iv)
  const rawSessionKey = await ks.decrypt(info.sessionKey)
  const sessionKey = await crypto.subtle.importKey(
    "raw",
    utils.base64ToArrBuf(rawSessionKey),
    "AES-GCM",
    false,
    [ "encrypt", "decrypt" ]
  )

  // Decrypt secrets
  const secrets =
    JSON.parse(utils.arrBufToStr(await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      sessionKey,
      utils.base64ToArrBuf(info.secrets)
    ), CharSize.B8))

  const fsSecrets: Record<string, { key: string, bareNameFilter: string }> = secrets.fs
  const ucans = secrets.ucans

  // Import read keys and bare name filters
  await Promise.all(
    Object.entries(fsSecrets).map(async ([ path, { bareNameFilter, key } ]) => {
      const readKeyId = await identifiers.readKey({ path })
      const bareNameFilterId = await identifiers.bareNameFilter({ path })

      await ks.importSymmKey(key, readKeyId)
      await localforage.setItem(bareNameFilterId, bareNameFilter)
    })
  )

  // Add UCANs to the storage
  await ucan.store(ucans)
}


async function validateSecrets(permissions: Permissions): Promise<boolean> {
  const ks = await keystore.get()

  return ucanPermissions.paths(permissions).reduce(
    (acc, path) => acc.then(async bool => {
      if (bool === false) return bool
      if (path.startsWith('/public')) return bool

      const keyName = await identifiers.readKey({ path })
      return await ks.keyExists(keyName)
    }),
    Promise.resolve(true)
  )
}
