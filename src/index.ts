import localforage from "localforage"

import * as common from "./common/index.js"
import * as ucan from "./ucan/internal.js"

import { AppInitOptions, InitialisationError, PermissionedAppInitOptions } from "./init/types.js"
import { validateSecrets } from "./auth/state.js"
import { bootstrapRootFileSystem, createFileSystem, loadFileSystem, loadRootFileSystem } from "./filesystem.js"

import FileSystem from "./fs/index.js"

import { impl as auth } from "./auth/implementation.js"
import { isPermissionedAppState } from "./auth/state.js"
import { setImplementations } from "./setup.js"
import { BASE_IMPLEMENTATION } from "./auth/implementation/base.js"
import { USE_WNFS_IMPLEMENTATION } from "./auth/implementation/use-wnfs.js"
import { LOBBY_IMPLEMENTATION } from "./auth/implementation/lobby.js"
import { AppState } from "./auth/state/app.js"
import { PermissionedAppState } from "./auth/state/permissionedApp.js"
import * as appState from "./auth/state/app.js"
import * as permissionedAppState from "./auth/state/permissionedApp.js"


/**
 * Check if we're authenticated and initiate the user's file system if 
 * authenticated (can be disabled).
 *
 * See `loadFileSystem` if you want to load the user's file system yourself.
 * NOTE: Only works on the main/ui thread, as it uses `window.location`.
 *
 */
export async function app(options: AppInitOptions): Promise<AppState> {
  options = options || {}

  const { useWnfs = false } = options

  if (useWnfs) {
    setImplementations(USE_WNFS_IMPLEMENTATION)
  } else {
    setImplementations(BASE_IMPLEMENTATION)
  }

  // Check if browser is supported
  if (globalThis.isSecureContext === false) throw InitialisationError.InsecureContext
  if (await isSupported() === false) throw InitialisationError.UnsupportedBrowser

  const authedUsername = await common.authenticatedUsername()

  if (authedUsername && useWnfs) {
    try {
      const fs = options.loadFileSystem === false ?
        undefined :
        await loadRootFileSystem()

      return appState.scenarioAuthed(
        authedUsername,
        fs
      )
    } catch {

      // Bootstrap filesystem if one doesn't exist
      return appState.scenarioAuthed(
        authedUsername,
        await bootstrapRootFileSystem()
      )
    }

  } else if (authedUsername) {
    return appState.scenarioAuthed(
      authedUsername,
      undefined
    )

  } else {
    return appState.scenarioNotAuthed()

  }
}

/**
 * Check if we're authenticated, process any lobby query-parameters present in the URL,
 * and initiate the user's file system if authenticated (can be disabled).
 *
 * See `loadFileSystem` if you want to load the user's file system yourself.
 * NOTE: Only works on the main/ui thread, as it uses `window.location`.
 *
 */
export async function permissionedApp(options: PermissionedAppInitOptions): Promise<PermissionedAppState> {
  options = options || {}

  const permissions = options.permissions || null

  setImplementations(LOBBY_IMPLEMENTATION)

  const maybeLoadFs = async (username: string): Promise<undefined | FileSystem> => {
    let fs: FileSystem | undefined

    if (options.loadFileSystem === false) {
      return fs
    }

    try {
      fs = await loadFileSystem(permissions, username)

    } catch (err) {
      if (options.rootKey) {
        fs = await createFileSystem(permissions, options.rootKey)
      } else {
        throw err
      }
    }

    return fs
  }

  // Check if browser is supported
  if (globalThis.isSecureContext === false) throw InitialisationError.InsecureContext
  if (await isSupported() === false) throw InitialisationError.UnsupportedBrowser


  const state = await auth.init(options)

  // Allow auth implementation to return a State directly
  if (state && isPermissionedAppState(state)) {
    return state
  }

  const authedUsername = await common.authenticatedUsername()

  if (authedUsername && permissions) {
    const validSecrets = await validateSecrets(permissions)
    const validUcans = ucan.validatePermissions(permissions, authedUsername)

    if (validSecrets && validUcans) {
      return permissionedAppState.scenarioContinuation(
        permissions,
        authedUsername,
        await maybeLoadFs(authedUsername)
      )
    } else {
      return permissionedAppState.scenarioNotAuthorised(permissions)
    }

  } else if (authedUsername) {
    return permissionedAppState.scenarioContinuation(
      permissions,
      authedUsername,
      await maybeLoadFs(authedUsername),
    )

  } else {
    return permissionedAppState.scenarioNotAuthorised(permissions)

  }
}


/**
 * Alias for `permissionedApp`.
 */
export { permissionedApp as initialise }
export { permissionedApp as initialize }



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
export { AppScenario, AppState } from "./auth/state/app.js"
export { AuthCancelled, AuthSucceeded, Continuation, NotAuthorised } from "./auth/state/permissionedApp.js"
export { Authed, NotAuthed } from "./auth/state/app.js"
export { PermissionedAppScenario as Scenario, PermissionedAppState as State } from "./auth/state/permissionedApp.js"
export { AppInitOptions, InitialisationError, PermissionedAppInitOptions } from "./init/types.js"

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
