import localforage from 'localforage'

import * as common from './common'
import * as keystore from './keystore'
import * as ucan from './ucan/internal'

import { READ_KEY_FROM_LOBBY_NAME, USERNAME_STORAGE_KEY } from './common'
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
  permissions: Permissions

  authenticated: false
}

export type AuthSucceeded = {
  scenario: Scenario.AuthSucceeded
  permissions: Permissions

  authenticated: true
  newUser: boolean
  throughLobby: true
  username: string

  fs?: FileSystem
}

export type AuthCancelled = {
  scenario: Scenario.AuthCancelled
  permissions: Permissions

  authenticated: false
  cancellationReason: string
  throughLobby: true
}

export type Continuation = {
  scenario: Scenario.Continuation
  permissions: Permissions

  authenticated: true
  newUser: false,
  throughLobby: false
  username: string

  fs?: FileSystem
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
    permissions: Permissions

    // Options
    autoRemoveUrlParams?: boolean
    loadFileSystem?: boolean
  }
): Promise<State> {
  options = options || {}

  const { permissions, autoRemoveUrlParams = true } = options
  const { app, fs } = permissions

  const maybeLoadFs = async (username: string): Promise<undefined | FileSystem> => {
    return options.loadFileSystem === false
      ? undefined
      : await loadFileSystem(permissions, username)
  }

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
    const readKey = await ks.decrypt(encryptedReadKey)
    await ks.importSymmKey(readKey, READ_KEY_FROM_LOBBY_NAME)
    await localforage.setItem(USERNAME_STORAGE_KEY, username)

    if (autoRemoveUrlParams) {
      url.searchParams.delete("newUser")
      url.searchParams.delete("readKey")
      url.searchParams.delete("ucans")
      url.searchParams.delete("username")
      history.replaceState(null, document.title, url.toString())
    }

    if (ucan.validatePermissions(permissions, username) === false) {
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
    ucan.validatePermissions(permissions, authedUsername)
  )
  ? scenarioContinuation(permissions, authedUsername, await maybeLoadFs(authedUsername))
  : scenarioNotAuthorised(permissions)
}


/**
 * Alias for `initialise`.
 */
export { initialise as initialize }



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



// ㊙️


function scenarioAuthSucceeded(
  permissions: Permissions,
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
  permissions: Permissions,
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
  permissions: Permissions,
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

function scenarioNotAuthorised(permissions: Permissions): NotAuthorised {
  return {
    scenario: Scenario.NotAuthorised,
    permissions,

    authenticated: false
  }
}
