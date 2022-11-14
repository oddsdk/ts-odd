/*

    %@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%
@@@@@%     %@@@@@@%         %@@@@@@@%     %@@@@@
@@@@@       @@@@@%            @@@@@@       @@@@@
@@@@@%      @@@@@             %@@@@@      %@@@@@
@@@@@@%     @@@@@     %@@%     @@@@@     %@@@@@@
@@@@@@@     @@@@@    %@@@@%    @@@@@     @@@@@@@
@@@@@@@     @@@@%    @@@@@@    @@@@@     @@@@@@@
@@@@@@@    %@@@@     @@@@@@    @@@@@%    @@@@@@@
@@@@@@@    @@@@@     @@@@@@    %@@@@@    @@@@@@@
@@@@@@@    @@@@@@@@@@@@@@@@     @@@@@    @@@@@@@
@@@@@@@    %@@@@@@@@@@@@@@@     @@@@%    @@@@@@@
@@@@@@@     %@@%     @@@@@@     %@@%     @@@@@@@
@@@@@@@              @@@@@@              @@@@@@@
@@@@@@@%            %@@@@@@%            %@@@@@@@
@@@@@@@@@%        %@@@@@@@@@@%        %@@@@@@@@@
%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    %@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%

 */

import * as Uint8arrays from "uint8arrays"
import localforage from "localforage"

import * as Auth from "./components/auth/implementation.js"
import * as ConfidencesImpl from "./components/confidences/implementation.js"
import * as Confidences from "./confidences.js"
import * as Crypto from "./components/crypto/implementation.js"
import * as Depot from "./components/depot/implementation.js"
import * as Manners from "./components/manners/implementation.js"
import * as Permissions from "./permissions.js"
import * as Reference from "./components/reference/implementation.js"
import * as RootKey from "./common/root-key.js"
import * as SessionMod from "./session.js"
import * as Storage from "./components/storage/implementation.js"
import * as Ucan from "./ucan/index.js"

import { SESSION_TYPE as CONFIDENCES_SESSION_TYPE } from "./confidences.js"
import { TYPE as WEB_CRYPTO_SESSION_TYPE } from "./components/auth/implementation/base.js"
import { Components } from "./components.js"
import { Configuration } from "./configuration.js"
import { isString, Maybe } from "./common/index.js"
import { Session } from "./session.js"
import { appId, AppInfo } from "./permissions.js"
import { loadFileSystem, loadRootFileSystem } from "./filesystem.js"


// IMPLEMENTATIONS

import * as BaseAuth from "./components/auth/implementation/base.js"
import * as BaseReference from "./components/reference/implementation/base.js"
import * as BrowserCrypto from "./components/crypto/implementation/browser.js"
import * as BrowserStorage from "./components/storage/implementation/browser.js"
import * as FissionIpfsProduction from "./components/depot/implementation/fission-ipfs-production.js"
import * as FissionIpfsStaging from "./components/depot/implementation/fission-ipfs-staging.js"
import * as FissionAuthBaseProduction from "./components/auth/implementation/fission-base-production.js"
import * as FissionAuthBaseStaging from "./components/auth/implementation/fission-base-staging.js"
import * as FissionAuthWnfsProduction from "./components/auth/implementation/fission-wnfs-production.js"
import * as FissionAuthWnfsStaging from "./components/auth/implementation/fission-wnfs-staging.js"
import * as FissionLobbyBase from "./components/confidences/implementation/fission-lobby.js"
import * as FissionLobbyProduction from "./components/confidences/implementation/fission-lobby-production.js"
import * as FissionLobbyStaging from "./components/confidences/implementation/fission-lobby-staging.js"
import * as FissionReferenceProduction from "./components/reference/implementation/fission-production.js"
import * as FissionReferenceStaging from "./components/reference/implementation/fission-staging.js"
import * as ProperManners from "./components/manners/implementation/base.js"


// RE-EXPORTS


export * from "./components.js"
export * from "./configuration.js"
export * from "./common/types.js"
export * from "./common/version.js"
export * from "./permissions.js"

export * as did from "./did/index.js"
export * as path from "./path/index.js"
export * as ucan from "./ucan/index.js"

export { Confidences, FileSystemSecret } from "./confidences.js"
export { FileSystem } from "./fs/filesystem.js"
export { Session } from "./session.js"



// ENTRY POINTS


export type Program = {
  auth: AuthenticationStrategies
  components: Components
  confidences: {
    collect: () => Promise<Maybe<string>> // returns username
    request: () => Promise<void>
    session: (username: string) => Promise<Maybe<Session>>
  }
  session: Maybe<Session>
}


export enum ProgramError {
  InsecureContext = "INSECURE_CONTEXT",
  UnsupportedBrowser = "UNSUPPORTED_BROWSER"
}


export type AuthenticationStrategies = Record<
  string,
  Auth.Implementation<Components> &
  {
    session: () => Promise<Maybe<Session>>
  }
>


export const DEFAULT_AUTH_STRATEGY_TYPE = BaseAuth.TYPE


/**
 * Build a webnative program.
 *
 * This will give you a `Program` object which has the following properties:
 * - `session`, a `Session` object if a session was created before.
 * - `auth`, a means to control the various auth strategies you configured. Use this to create sessions. Read more about auth components in the toplevel `auth` object documention.
 * - `confidences`, a means to control confidences. Use this to collect & request confidences, and to create a session based on them. Read more about confidences in the toplevel `confidences` object documentation.
 * - `components`, your full set of `Components`.
 *
 * See `assemble` for more information.
 */
export async function program(settings: Partial<Components> & Configuration): Promise<Program> {
  if (!settings) throw new Error("Expected a settings object of the type `Partial<Components> & Configuration` as the first parameter")

  const components = await gatherComponents(settings)
  return assemble(settings, components)
}



// PREDEFINED COMPONENT COMBINATIONS


/**
 * Predefined auth configurations.
 *
 * This component goes hand in hand with the "reference" and "depot" components.
 * The "auth" component registers a DID and the reference looks it up.
 * The reference component also manages the "data root", the pointer to an account's entire filesystem.
 * Then the depot component comes in which is responsible to get the data from, and to the other side.
 *
 * For example, using the Fission architecture, the data root is updated on the Fission server,
 * which then in turn fetches the data from the depot in your app.
 *
 * So if you want to build a service independent of Fission's infrastructure,
 * you will need to write your own reference and depot implementations (see source code).
 *
 * NOTE: This uses all the default components as the dependencies for the auth component.
 *       If you're, for example, using a non-default storage component, you'll want to
 *       pass that in here as a parameter as well.
 *
 *       Dependents: crypto, manners, reference, storage.
 */
export const auth = {
  /**
   * A standalone authentication system that uses the browser's Web Crypto API
   * to create an identity based on a RSA key-pair.
   *
   * NOTE: This uses a Fission server to register an account (DID).
   *       Check out the `wnfs` and `base` auth implementations if
   *       you want to build something without the Fission infrastructure.
   */
  async fissionWebCrypto(
    config: Configuration,
    options: {
      disableWnfs?: boolean
      staging?: boolean

      // Dependents
      crypto?: Crypto.Implementation
      manners?: Manners.Implementation
      reference?: Reference.Implementation
      storage?: Storage.Implementation
    } = {}
  ): Promise<Auth.Implementation<Components>> {
    const { disableWnfs, staging } = options

    const manners = options.manners || defaultMannersComponent(config)
    const crypto = options.crypto || await defaultCryptoComponent(config.appInfo)
    const storage = options.storage || defaultStorageComponent(config.appInfo)
    const reference = options.reference || await defaultReferenceComponent({ crypto, manners, storage })

    if (disableWnfs) {
      if (staging) return FissionAuthBaseStaging.implementation({ crypto, reference, storage })
      return FissionAuthBaseProduction.implementation({ crypto, reference, storage })
    } else {
      if (staging) return FissionAuthWnfsStaging.implementation({ crypto, reference, storage })
      return FissionAuthWnfsProduction.implementation({ crypto, reference, storage })
    }
  }
}

/**
 * Predefined confidences configurations.
 *
 * If you want partial read and/or write access to the filesystem you'll want
 * a "confidences" component. This component is responsible for requesting
 * and receiving UCANs, read keys and namefilters from other sources to enable this.
 *
 * NOTE: This uses all the default components as the dependencies for the confidences component.
 *       If you're, for example, using a non-default crypto component, you'll want to
 *       pass that in here as a parameter as well.
 *
 *       Dependents: crypto, depot.
 */
export const confidences = {
  /**
   * A secure enclave in the form of a webnative app which serves as the root authority.
   * Your app is redirect to the lobby where the user can create an account or link a device,
   * and then request permissions to the user for reading or write to specific parts of the filesystem.
   */
  async fissionLobby(
    config: Configuration,
    options: {
      staging?: boolean

      // Dependents
      crypto?: Crypto.Implementation
      depot?: Depot.Implementation
    } = {}
  ): Promise<ConfidencesImpl.Implementation> {
    const { staging } = options

    const crypto = options.crypto || await defaultCryptoComponent(config.appInfo)
    const depot = options.depot || await defaultDepotComponent(config.appInfo)

    if (staging) return FissionLobbyStaging.implementation({ crypto, depot })
    return FissionLobbyProduction.implementation({ crypto, depot })
  }
}

/**
 * Predefined depot configurations.
 *
 * The depot component gets data in and out your program.
 * For example, say I want to load and then update a file system.
 * The depot will get that file system data for me,
 * and when updating it, bring the data to where it needs to be.
 */
export const depot = {
  /**
   * This depot uses IPFS and the Fission servers.
   * The data is transferred to the Fission IPFS node,
   * where all of your encrypted and public data lives.
   * Other webnative programs with this depot fetch the data from there.
   */
  async fissionIPFS(
    config: Configuration,
    { staging }: { staging?: boolean } = {}
  ): Promise<Depot.Implementation> {
    const repoName = `${appId(config.appInfo)}/ipfs`
    if (staging) return FissionIpfsStaging.implementation(repoName)
    return FissionIpfsProduction.implementation(repoName)
  }
}


/**
 * Predefined reference configurations.
 *
 * The reference component is responsible for looking up and updating various pointers.
 * Specifically, the data root, a user's DID root, DNSLinks, DNS TXT records.
 * It also holds repositories (see `Repository` class), which contain UCANs and CIDs.
 *
 * NOTE: This uses all the default components as the dependencies for the reference component.
 *       If you're, for example, using a non-default storage component, you'll want to
 *       pass that in here as a parameter as well.
 *
 *       Dependents: crypto, manners, storage.
 */
export const reference = {
  /**
   * Use the Fission servers as your reference.
   */
  async fission(
    config: Configuration,
    options: {
      staging?: boolean

      // Dependents
      crypto?: Crypto.Implementation
      manners?: Manners.Implementation
      storage?: Storage.Implementation
    } = {}
  ): Promise<Reference.Implementation> {
    const { staging } = options

    const manners = options.manners || defaultMannersComponent(config)
    const crypto = options.crypto || await defaultCryptoComponent(config.appInfo)
    const storage = options.storage || defaultStorageComponent(config.appInfo)

    if (staging) return FissionReferenceStaging.implementation({ crypto, manners, storage })
    return FissionReferenceProduction.implementation({ crypto, manners, storage })
  }
}



// ASSEMBLE


/**
 * Build a Webnative Program based on a given set of `Components`.
 * These are various customisable components that determine how a Webnative app works.
 * Use `program` to work with a default, or partial, set of components.
 *
 * Additionally this does a few other things:
 * - Checks if the browser is supported.
 * - Restores a session if one was made before, and load the user's file system if needed.
 * - Attempts to collect confidences if the configuration has permissions.
 * - Provides shorthands to functions so you don't have to pass in components.
 * - Ensure backwards compatibility with older Webnative clients.
 *
 * See `loadFileSystem` if you want to load the user's file system yourself.
 */
export async function assemble(config: Configuration, components: Components): Promise<Program> {
  const permissions = Permissions.permissionsFromConfig(config.permissions, config.appInfo)

  // Check if browser is supported
  if (globalThis.isSecureContext === false) throw ProgramError.InsecureContext
  if (await isSupported() === false) throw ProgramError.UnsupportedBrowser

  // Backwards compatibility (data)
  await ensureBackwardsCompatibility(components, config)

  // Authenticated user
  const sessionInfo = await SessionMod.restore(components.storage)

  // Auth implementations
  const auth = components.auth.reduce(
    (acc: AuthenticationStrategies, method: Auth.Implementation<Components>): AuthenticationStrategies => {
      const wrap = {
        ...method,
        async session(): Promise<Maybe<Session>> {
          const newSessionInfo = await SessionMod.restore(components.storage)
          if (!newSessionInfo) return null

          return this.activate(
            components,
            newSessionInfo.username,
            config
          )
        }
      }

      return {
        ...acc,
        [ method.type ]: wrap
      }
    },
    {}
  )

  // Confidences
  const confidences = {
    async collect() {
      const c = await components.confidences.collect()
      if (!c) return null

      await Confidences.collect({
        confidences: c,
        crypto: components.crypto,
        reference: components.reference,
        storage: components.storage
      })

      return c.username
    },
    request() {
      return components.confidences.request({
        permissions
      })
    },
    async session(username: string) {
      const ucan = Confidences.validatePermissions(
        components.reference.repositories.ucans,
        permissions || {}
      )

      if (!ucan) {
        console.warn("The present UCANs did not satisfy the configured permissions.")
        return null
      }

      const accountDID = Ucan.rootIssuer(ucan)
      const validSecrets = await Confidences.validateSecrets(
        components.crypto,
        accountDID,
        permissions || {}
      )

      if (!validSecrets) {
        console.warn("The present filesystem secrets did not satisfy the configured permissions.")
        return null
      }

      await SessionMod.provide(components.storage, { type: CONFIDENCES_SESSION_TYPE, username })

      const fs = config.filesystem?.loadImmediately === false ?
        undefined :
        await loadFileSystem({
          config,
          dependents: components,
          username,
        })

      return new Session({
        fs,
        username,
        crypto: components.crypto,
        storage: components.storage,
        type: CONFIDENCES_SESSION_TYPE,
      })
    }
  }

  // Session
  let session = null

  if (isConfidentialAuthConfiguration(config)) {
    const username = await confidences.collect()
    if (username) session = await confidences.session(username)
    if (sessionInfo && sessionInfo.type === CONFIDENCES_SESSION_TYPE) session = await confidences.session(sessionInfo.username)

  } else if (sessionInfo && sessionInfo.type !== CONFIDENCES_SESSION_TYPE) {
    session = await auth[ sessionInfo.type ]?.session()

  }

  // Shorthands
  const shorthands = {
    loadFileSystem: (username: string) => loadFileSystem({ config, username, dependents: components }),
    loadRootFileSystem: (username: string) => loadRootFileSystem({ config, username, dependents: components }),
  }

  // Fin
  return {
    ...shorthands,
    auth,
    components,
    confidences,
    session,
  }
}



// COMPOSITIONS


/**
 * Full component sets.
 */
export const compositions = {
  /**
   * The default Fission stack using web crypto auth.
   */
  async fission(
    config: Configuration,
    options: {
      disableWnfs?: boolean
      staging?: boolean

      // Dependents
      crypto?: Crypto.Implementation
      manners?: Manners.Implementation
      storage?: Storage.Implementation
    } = {}
  ): Promise<Components> {
    const { disableWnfs, staging } = options

    const crypto = options.crypto || await defaultCryptoComponent(config.appInfo)
    const manners = options.manners || defaultMannersComponent(config)
    const storage = options.storage || defaultStorageComponent(config.appInfo)

    const r = await reference.fission(config, { crypto, manners, staging, storage })
    const d = await depot.fissionIPFS(config, { staging })
    const c = await confidences.fissionLobby(config, { depot: d, crypto, staging })
    const a = await auth.fissionWebCrypto(config, { reference: r, crypto, disableWnfs, manners, staging, storage })

    return {
      auth: [ a ],
      confidences: c,
      depot: d,
      reference: r,
      crypto,
      manners,
      storage,
    }
  }
}


export async function gatherComponents(setup: Partial<Components> & Configuration): Promise<Components> {
  const config = extractConfig(setup)

  const crypto = setup.crypto || await defaultCryptoComponent(config.appInfo)
  const manners = setup.manners || defaultMannersComponent(config)
  const storage = setup.storage || defaultStorageComponent(config.appInfo)

  const reference = setup.reference || await defaultReferenceComponent({ crypto, manners, storage })
  const depot = setup.depot || await defaultDepotComponent(config.appInfo)
  const confidences = setup.confidences || defaultConfidencesComponent({ crypto, depot })
  const auth = setup.auth || [ defaultAuthComponent({ crypto, reference, storage }) ]

  return {
    auth,
    confidences,
    crypto,
    depot,
    manners,
    reference,
    storage,
  }
}



// DEFAULT COMPONENTS


export function defaultAuthComponent({ crypto, reference, storage }: BaseAuth.Dependents): Auth.Implementation<Components> {
  return FissionAuthWnfsProduction.implementation({
    crypto, reference, storage,
  })
}

export function defaultConfidencesComponent({ crypto, depot }: FissionLobbyBase.Dependents): ConfidencesImpl.Implementation {
  return FissionLobbyProduction.implementation({ crypto, depot })
}

export function defaultCryptoComponent(appInfo: AppInfo): Promise<Crypto.Implementation> {
  return BrowserCrypto.implementation({
    storeName: appId(appInfo),
    exchangeKeyName: "exchange-key",
    writeKeyName: "write-key"
  })
}

export function defaultDepotComponent(appInfo: AppInfo): Promise<Depot.Implementation> {
  return FissionIpfsProduction.implementation(
    `${appId(appInfo)}/ipfs`
  )
}

export function defaultMannersComponent(config: Configuration): Manners.Implementation {
  return ProperManners.implementation({
    configuration: config
  })
}

export function defaultReferenceComponent({ crypto, manners, storage }: BaseReference.Dependents): Promise<Reference.Implementation> {
  return FissionReferenceProduction.implementation({
    crypto,
    manners,
    storage,
  })
}

export function defaultStorageComponent(appInfo: AppInfo): Storage.Implementation {
  return BrowserStorage.implementation({
    name: appId(appInfo)
  })
}



// 🛟


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



// BACKWARDS COMPAT


async function ensureBackwardsCompatibility(components: Components, config: Configuration): Promise<void> {
  // Old pieces:
  // - Key pairs: IndexedDB → keystore → exchange-key & write-key
  // - UCAN used for account linking/delegation: IndexedDB → localforage → ucan
  // - Root read key of the filesystem: IndexedDB → localforage → readKey
  // - Authenticated username: IndexedDB → localforage → webnative.auth_username

  const keystoreDB = await bwOpenDatabase("keystore")

  if (keystoreDB) {
    const exchangeKeyPair = await bwGetValue(keystoreDB, "keyvaluepairs", "exchange-key")
    const writeKeyPair = await bwGetValue(keystoreDB, "keyvaluepairs", "write-key")

    if (exchangeKeyPair && writeKeyPair) {
      await components.storage.setItem("exchange-key", exchangeKeyPair)
      await components.storage.setItem("write-key", writeKeyPair)
    }

    bwDeleteDatabase(keystoreDB)
  }

  const localforageDB = await bwOpenDatabase("localforage")

  if (localforageDB) {
    const accountUcan = await bwGetValue(localforageDB, "keyvaluepairs", "ucan")
    const permissionedUcans = await bwGetValue(localforageDB, "keyvaluepairs", "webnative.auth_ucans")
    const rootKey = await bwGetValue(localforageDB, "keyvaluepairs", "readKey")
    const authedUser = await bwGetValue(localforageDB, "keyvaluepairs", "webnative.auth_username")

    if (rootKey && isString(rootKey)) {
      const anyUcan = accountUcan || (Array.isArray(permissionedUcans) ? permissionedUcans[ 0 ] : undefined)
      const accountDID = anyUcan ? Ucan.rootIssuer(anyUcan) : null
      if (!accountDID) throw new Error("Failed to retrieve account DID")

      await RootKey.store({
        accountDID,
        crypto: components.crypto,
        readKey: Uint8arrays.fromString(rootKey, "base64pad"),
      })
    }

    if (accountUcan) {
      await components.storage.setItem(
        components.storage.KEYS.ACCOUNT_UCAN,
        accountUcan
      )
    }

    if (authedUser) {
      await components.storage.setItem(
        components.storage.KEYS.SESSION,
        JSON.stringify({
          type: isConfidentialAuthConfiguration(config) ? CONFIDENCES_SESSION_TYPE : WEB_CRYPTO_SESSION_TYPE,
          username: authedUser
        })
      )
    }

    bwDeleteDatabase(localforageDB)
  }
}


function bwDeleteDatabase(db: IDBDatabase): void {
  const name = db.name
  db.close()
  indexedDB.deleteDatabase(name)
}


function bwGetValue(db: IDBDatabase, storeName: string, key: string): Promise<Maybe<unknown>> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) return resolve(null)

    const transaction = db.transaction([ storeName ], "readonly")
    const store = transaction.objectStore(storeName)
    const req = store.get(key)

    req.onerror = () => {
      // No store, moving on.
      resolve(null)
    }

    req.onsuccess = () => {
      resolve(req.result)
    }
  })
}


function bwOpenDatabase(name: string): Promise<Maybe<IDBDatabase>> {
  return new Promise((resolve, reject) => {
    const req = self.indexedDB.open(name)

    req.onerror = () => {
      // No database, moving on.
      resolve(null)
    }

    req.onsuccess = () => {
      resolve(req.result)
    }
  })
}



// 🛠


export function extractConfig(opts: Partial<Components> & Configuration): Configuration {
  return {
    appInfo: opts.appInfo,
    debug: opts.debug,
    filesystem: opts.filesystem,
    userMessages: opts.userMessages,
  }
}


export function isConfidentialAuthConfiguration(config: Configuration): boolean {
  return !!config.permissions
}