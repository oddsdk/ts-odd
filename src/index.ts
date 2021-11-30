import localforage from "localforage"

import * as common from "./common/index.js"
import * as identifiers from "./common/identifiers.js"
import * as ipfs from "./ipfs/index.js"
import * as pathing from "./path.js"
import * as crypto from "./crypto/index.js"
import * as storage from "./storage/index.js"
import * as ucan from "./ucan/internal.js"
import * as ucanPermissions from "./ucan/permissions.js"
import { setup } from "./setup/internal.js"
import * as did from "./did/index.js"

import { USERNAME_STORAGE_KEY, Maybe } from "./common/index.js"
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

    await retry(async () => importClassifiedInfo(
      authorised === "via-postmessage"
        ? await getClassifiedViaPostMessage()
        : JSON.parse(await ipfs.cat(authorised)) // in any other case we expect it to be a CID
    ), { tries: 10, timeout: 10000, timeoutMessage: "Trying to retrieve UCAN(s) and readKey(s) from the auth lobby timed out after 10 seconds." })

    await storage.setItem(USERNAME_STORAGE_KEY, username)

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
    const c = (() => {
      switch (cancellation) {
        case "DENIED": return "User denied authorisation"
        default: return "Unknown reason"
      }
    })()

    return scenarioAuthCancelled(permissions, c)

  } else {
    // trigger build for internal ucan dictionary
    await ucan.store([])

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

interface AuthLobbyClassifiedInfo {
  sessionKey: string
  secrets: string
  iv: string
}


async function importClassifiedInfo(
  classifiedInfo: AuthLobbyClassifiedInfo
): Promise<void> {
  // Extract session key and its iv
  const rawSessionKey = await crypto.keystore.decrypt(classifiedInfo.sessionKey)

  // Decrypt secrets
  const secretsStr = await crypto.aes.decryptGCM(classifiedInfo.secrets, rawSessionKey, classifiedInfo.iv)
  const secrets = JSON.parse(secretsStr)

  const fsSecrets: Record<string, { key: string; bareNameFilter: string }> = secrets.fs
  const ucans = secrets.ucans

  // Import read keys and bare name filters
  await Promise.all(
    Object.entries(fsSecrets).map(async ([posixPath, { bareNameFilter, key }]) => {
      const path = pathing.fromPosix(posixPath)
      const readKeyId = await identifiers.readKey({ path })
      const bareNameFilterId = await identifiers.bareNameFilter({ path })

      await crypto.keystore.importSymmKey(key, readKeyId)
      await storage.setItem(bareNameFilterId, bareNameFilter)
    })
  )

  // Add UCANs to the storage
  await ucan.store(ucans)
}

async function getClassifiedViaPostMessage(): Promise<AuthLobbyClassifiedInfo> {
  const iframe: HTMLIFrameElement = await new Promise(resolve => {
    const iframe = document.createElement("iframe")
    iframe.id = "webnative-secret-exchange"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "none"
    iframe.style.display = "none"
    document.body.appendChild(iframe)

    iframe.onload = () => {
      resolve(iframe)
    }

    iframe.src = `${setup.endpoints.lobby}/exchange.html`
  })

  try {

    const answer: Promise<AuthLobbyClassifiedInfo> = new Promise((resolve, reject) => {
      let tries = 10
      window.addEventListener("message", listen)

      function retryOrReject(eventData?: string) {
        console.warn(`When importing UCANs & readKey(s): Can't parse: ${eventData}. Might be due to extensions.`)
        if (--tries === 0) {
          window.removeEventListener("message", listen)
          reject(new Error("Couldn't parse message from auth lobby after 10 tries. See warnings above."))
        }
      }

      function listen(event: MessageEvent<string>) {
        if (new URL(event.origin).host !== new URL(setup.endpoints.lobby).host) {
          console.log(`Got a message from ${event.origin} while waiting for login credentials. Ignoring.`)
          return
        }

        if (event.data == null) {
          // Might be an extension sending a message without data
          return
        }

        let classifiedInfo: unknown = null
        try {
          classifiedInfo = JSON.parse(event.data)
        } catch {
          retryOrReject(event.data)
          return
        }

        if (!isAuthLobbyClassifiedInfo(classifiedInfo)) {
          retryOrReject(event.data)
          return
        }

        window.removeEventListener("message", listen)
        resolve(classifiedInfo)
      }
    })

    if (iframe.contentWindow == null) throw new Error("Can't import UCANs & readKey(s): No access to its contentWindow")
    const message = {
      webnative: "exchange-secrets",
      didExchange: await did.exchange()
    }
    iframe.contentWindow.postMessage(message, iframe.src)

    return await answer

  } finally {
    document.body.removeChild(iframe)
  }
}

async function validateSecrets(permissions: Permissions): Promise<boolean> {
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

async function retry(action: () => Promise<void>, options: { tries: number; timeout: number; timeoutMessage: string }): Promise<void> {
  return await Promise.race([
    (async () => {
      let tryNum = 1
      while (tryNum <= options.tries) {
        try {
          await action()
          return
        } catch (e) {
          if (tryNum == options.tries) {
            throw e
          }
        }
        tryNum++
      }
    })(),
    new Promise<void>((resolve, reject) => setTimeout(() => reject(new Error(options.timeoutMessage)), options.timeout))
  ])
}


interface AuthLobbyClassifiedInfo {
  sessionKey: string
  secrets: string
  iv: string
}

function isAuthLobbyClassifiedInfo(obj: unknown): obj is AuthLobbyClassifiedInfo {
  return common.isObject(obj)
    && common.isString(obj.sessionKey)
    && common.isString(obj.secrets)
    && common.isString(obj.iv)
}
