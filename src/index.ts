import localforage from 'localforage'

import * as auth from './auth'
import * as common from './common'
import * as keystore from './keystore'
import * as ucan from './ucan/internal'

import { READ_KEY_FROM_LOBBY_NAME, USERNAME_STORAGE_KEY } from './common'
import { AppInfo, FileSystemPrerequisites, Prerequisites } from './ucan/prerequisites'
import { loadFileSystem } from './filesystem'

import FileSystem from './fs'
import fsClass from './fs'



// SCENARIO


export type Scenario = {
  notAuthorised?: true,
  authSucceeded?: true,
  authCancelled?: true,
  continuation?: true,
}

export type FulfilledScenario = {
  prerequisites: Prerequisites,
  scenario: Scenario,
  state: State
}



// STATE


export type State
  = NotAuthorised
  | AuthSucceeded
  | AuthCancelled
  | Continuation

export type NotAuthorised = {
  authenticated: false
}

export type AuthSucceeded = {
  authenticated: true
  newUser: boolean
  throughLobby: true
  username: string

  fs?: FileSystem
}

export type AuthCancelled = {
  authenticated: false
  cancellationReason: string
  throughLobby: true
}

export type Continuation = {
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
    // Prerequisites
    app?: AppInfo,
    fs?: FileSystemPrerequisites,

    // Options
    autoRemoveUrlParams?: boolean
    loadFileSystem?: boolean
  }
): Promise<FulfilledScenario> {
  options = options || {}

  const { app, fs, autoRemoveUrlParams } = options
  const prerequisites = { app, fs }

  const maybeLoadFs = async (username: string): Promise<undefined | FileSystem> => {
    return options.loadFileSystem === false
      ? undefined
      : await loadFileSystem(prerequisites, username)
  }

  const url = new URL(window.location.href)
  const cancellation = url.searchParams.get("cancelled")
  const ucans = url.searchParams.get("ucans")

  // Add UCANs to the storage
  await ucan.store(ucans ? ucans.split(",") : [])

  // Determine scenario
  if (ucans) {
    const newUser = url.searchParams.get("newUser") === "t"
    const readKey = url.searchParams.get("readKey") || ""
    const username = url.searchParams.get("username") || ""

    const ks = await keystore.get()
    await ks.importSymmKey(readKey, READ_KEY_FROM_LOBBY_NAME)
    await localforage.setItem(USERNAME_STORAGE_KEY, username)

    if (autoRemoveUrlParams || autoRemoveUrlParams === undefined) {
      url.searchParams.delete("newUser")
      url.searchParams.delete("readKey")
      url.searchParams.delete("ucans")
      url.searchParams.delete("username")
      history.replaceState(null, document.title, url.toString())
    }

    if (ucan.validatePrerequisites(prerequisites, username) === false) {
      return scenarioNotAuthorised(prerequisites)
    }

    return scenarioAuthSucceeded(
      prerequisites,
      newUser,
      username,
      await maybeLoadFs(username)
    )

  } else if (cancellation) {
    const c = (_ => { switch (cancellation) {
      case "DENIED": return "User denied authorisation"
      default: return "Unknown reason"
    }})()

    return scenarioAuthCancelled(prerequisites, c)

  }

  const authedUsername = await common.authenticatedUsername()

  return (
    authedUsername &&
    ucan.validatePrerequisites(prerequisites, authedUsername)
  )
  ? scenarioContinuation(prerequisites, authedUsername, await maybeLoadFs(authedUsername))
  : scenarioNotAuthorised(prerequisites)
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
  prerequisites: Prerequisites,
  newUser: boolean,
  username: string,
  fs: FileSystem | undefined
): FulfilledScenario {
  return {
    prerequisites,
    scenario: { authSucceeded: true },
    state: {
      authenticated: true,
      throughLobby: true,
      fs,
      newUser,
      username
    }
  }
}

function scenarioAuthCancelled(
  prerequisites: Prerequisites,
  cancellationReason: string
): FulfilledScenario {
  return {
    prerequisites,
    scenario: { authCancelled: true },
    state: {
      authenticated: false,
      throughLobby: true,
      cancellationReason
    }
  }
}

function scenarioContinuation(
  prerequisites: Prerequisites,
  username: string,
  fs: FileSystem | undefined
): FulfilledScenario {
  return {
    prerequisites,
    scenario: { continuation: true },
    state: {
      authenticated: true,
      newUser: false,
      throughLobby: false,
      fs,
      username
    }
  }
}

function scenarioNotAuthorised(
  prerequisites: Prerequisites
): FulfilledScenario {
  return {
    prerequisites,
    scenario: { notAuthorised: true },
    state: { authenticated: false }
  }
}
