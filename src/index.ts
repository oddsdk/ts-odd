import localforage from "localforage"

import * as auth from "./auth/internal.js"
import * as cidLog from "./common/cid-log.js"
import * as common from "./common/index.js"
import * as dataRoot from "./data-root.js"
import * as pathing from "./path.js"
import * as ucan from "./ucan/internal.js"

import { InitOptions, InitialisationError } from "./init/types.js"
import { State, scenarioContinuation, scenarioNotAuthorised, validateSecrets } from "./auth/state.js"
import { createFilesystem, loadFileSystem } from "./filesystem.js"

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
  const { useWnfs = false, rootKey } = options

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
      return scenarioContinuation(
        permissions,
        authedUsername,
        await maybeLoadFs(authedUsername)
      )
    } else {
      return scenarioNotAuthorised(permissions)
    }

  } else if (authedUsername && useWnfs) {
    if (options.loadFileSystem === false) throw new Error("Must load filesystem when using the useWnfs option.")

    const dataCid = navigator.onLine ? await dataRoot.lookup(authedUsername) : null // data root on server
    const logCid = await cidLog.newest() // data root in app
    const rootPermissions = { fs: { private: [pathing.root()], public: [pathing.root()] } }

    if (dataCid === null && logCid === undefined) {
      return scenarioContinuation(
        rootPermissions,
        authedUsername,
        await createFilesystem(rootPermissions)
      )
    } else {
      return scenarioContinuation(
        rootPermissions,
        authedUsername,
        await maybeLoadFs(authedUsername),
      )
    }

  } else if (authedUsername) {
    return scenarioContinuation(
      permissions,
      authedUsername,
      await maybeLoadFs(authedUsername),
    )

  } else {
    return scenarioNotAuthorised(permissions)

  }
}



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
