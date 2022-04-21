import localforage from "localforage"

import * as auth from "./auth/internal.js"
import * as common from "./common/index.js"
import * as ucan from "./ucan/internal.js"

import type { ConnectionStatusEventMap } from "./ipfs/config.js"
import type { EventEmitter } from "./common/event-emitter.js"

import { InitOptions, InitialisationError } from "./init/types.js"
import { State, scenarioContinuation, scenarioNotAuthorised, validateSecrets } from "./auth/state.js"
import { loadFileSystem } from "./filesystem.js"
import { setLocalIpfs } from "./ipfs/config.js"

import FileSystem from "./fs/index.js"


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
  const { localIpfs = false, rootKey } = options

  const maybeLoadFs = async (username: string): Promise<undefined | FileSystem> => {
    return options.loadFileSystem === false
      ? undefined
      : await loadFileSystem(permissions, username, rootKey)
  }

  const maybeSetLocalIpfs = async (): Promise<undefined | EventEmitter<ConnectionStatusEventMap>> => {
    return localIpfs === false
      ? undefined
      : await setLocalIpfs()
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
      const connectionStatus = await maybeSetLocalIpfs()

      return scenarioContinuation(
        permissions, 
        authedUsername, 
        await maybeLoadFs(authedUsername), 
        connectionStatus
      )
    } else {
      return scenarioNotAuthorised(permissions)
    }

  } else if (authedUsername) {
    const connectionStatus = await maybeSetLocalIpfs()

    return scenarioContinuation(
      permissions, 
      authedUsername, 
      await maybeLoadFs(authedUsername), 
      connectionStatus
    )

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
export { Scenario, State } from "./auth/state.js"
export { AuthCancelled, AuthSucceeded, Continuation, NotAuthorised } from "./auth/state.js"
export { InitialisationError, InitOptions } from "./init/types.js"

export * as account from "./auth/index.js"
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
