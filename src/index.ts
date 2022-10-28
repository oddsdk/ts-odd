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

import localforage from "localforage"

import * as Auth from "./components/auth/implementation.js"
import * as ConfidencesImpl from "./components/confidences/implementation.js"
import * as Confidences from "./confidences.js"
import * as Crypto from "./components/crypto/implementation.js"
import * as Depot from "./components/depot/implementation.js"
import * as Manners from "./components/manners/implementation.js"
import * as Permissions from "./permissions.js"
import * as Reference from "./components/reference/implementation.js"
import * as SessionMod from "./session.js"
import * as Storage from "./components/storage/implementation.js"
import * as Ucan from "./ucan/index.js"

import { SESSION_TYPE as CONFIDENCES_SESSION_TYPE } from "./confidences.js"
import { Components, Configuration, extractConfig, InitialisationError } from "./configuration.js"
import { Maybe } from "./common/index.js"
import { Session } from "./session.js"
import { appId, AppInfo } from "./permissions.js"
import { loadFileSystem, loadRootFileSystem } from "./filesystem.js"


// IMPLEMENTATIONS

import * as BrowserCrypto from "./components/crypto/implementation/browser.js"
import * as BrowserStorage from "./components/storage/implementation/browser.js"
import * as FissionIpfsProduction from "./components/depot/implementation/fission-ipfs-production.js"
import * as FissionAuthBaseProduction from "./components/auth/implementation/fission-base-production.js"
import * as FissionAuthBaseStaging from "./components/auth/implementation/fission-base-staging.js"
import * as FissionAuthWnfsProduction from "./components/auth/implementation/fission-wnfs-production.js"
import * as FissionAuthWnfsStaging from "./components/auth/implementation/fission-wnfs-staging.js"
import * as FissionLobbyProduction from "./components/confidences/implementation/fission-lobby-production.js"
import * as FissionLobbyStaging from "./components/confidences/implementation/fission-lobby-staging.js"
import * as FissionReferenceProduction from "./components/reference/implementation/fission-production.js"
import * as ProperManners from "./components/manners/implementation/base.js"


// RE-EXPORTS


export * from "./common/types.js"
export * from "./common/version.js"

export * as path from "./path/index.js"



// ENTRY POINTS


export type Program = {
  auth: AuthenticationStrategies,
  components: Components,
  confidences: {
    collect: () => Promise<Maybe<string>> // returns username
    request: () => Promise<void>
    session: (username: string) => Promise<Maybe<Session>>
  },
  session: Maybe<Session>
}


export type AuthenticationStrategies = Record<
  string,
  { implementation: Auth.Implementation, session: () => Promise<Maybe<Session>> }
>


/**
 * Check if we're authenticated and initiate the user's file system if
 * authenticated (can be disabled).
 *
 * See `loadFileSystem` if you want to load the user's file system yourself.
 *
 */
export async function program(settings: Partial<Components> & Configuration): Promise<Program> {
  if (!settings) throw new Error("Expected a settings object of the type `Partial<Components> & Configuration` as the first parameter")

  const components = await gatherComponents(settings)
  return assemble(components, settings)
}



// PREDEFINED COMPONENT COMBINATIONS


/**
 * Predefined auth configurations.
 *
 * Note that these go hand in hand with the "reference" and "depot" components.
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
 *       import the auth module and produce an implementation yourself. That way you can
 *       pass in your custom storage component.
 */
export const auth = {
  /**
   * A standalone authentication system that uses the browser's Web Crypto API
   * to create an identity based on a RSA key-pair.
   */
  async webCrypto(config: Configuration, { disableWnfs, staging }: { disableWnfs: boolean, staging: boolean }): Promise<Auth.Implementation> {
    const manners = defaultMannersComponent(config)
    const crypto = await defaultCryptoComponent(config.appInfo)
    const storage = defaultStorageComponent(config.appInfo)
    const reference = defaultReferenceComponent({ crypto, manners, storage })

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
 * If you want partial read and/or write access to the filesystem you'll want
 * a "confidences" component. This component is responsible for requesting
 * and receiving UCANs, read keys and namefilters from other sources to enable this.
 *
 * NOTE: This uses all the default components as the dependencies for the confidences component.
 *       If you're, for example, using a non-default crypto component, you'll want to
 *       import the confidences module and produce an implementation yourself. That way you can
 *       pass in your custom crypto component.
 */
export const confidences = {
  /**
   * A secure enclave in the form of a webnative app which serves as the root authority.
   * Your app is redirect to the lobby where the user can create an account or link a device,
   * and then request permissions to the user for reading or write to specific parts of the filesystem.
   */
  async fissionLobby(config: Configuration, { staging }: { staging?: boolean }) {
    const crypto = await defaultCryptoComponent(config.appInfo)
    const depot = await defaultDepotComponent()

    if (staging) return FissionLobbyStaging.implementation({ crypto, depot })
    return FissionLobbyProduction.implementation({ crypto, depot })
  }
}



// ASSEMBLE


/**
 * Initialise a Webnative App based on a given set of `Components`.
 * These are various customisable components to determine how a Webnative app works.
 *
 * Normally you'll want to prefer a predefined set of components by using
 * the functions `app` or `delegateApp`. But if you feel adventurous
 * you can build your own path.
 */
export async function assemble(components: Components, config: Configuration): Promise<Program> {
  // Check if browser is supported
  if (globalThis.isSecureContext === false) throw InitialisationError.InsecureContext
  if (await isSupported() === false) throw InitialisationError.UnsupportedBrowser

  // Authenticated user
  const sessionInfo = await SessionMod.restore(components.storage)

  // Auth implementations
  const auth = components.auth.reduce(
    (acc: AuthenticationStrategies, method: Auth.Implementation): AuthenticationStrategies => {
      const wrap = {
        implementation: method,
        async session(): Promise<Maybe<Session>> {
          const newSessionInfo = await SessionMod.restore(components.storage)
          if (!newSessionInfo) return null

          return this.implementation.activate(
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
        permissions: config.permissions
      })
    },
    async session(username: string) {
      const permissions = Permissions.withAppInfo(config.permissions || {}, config.appInfo)
      const ucan = Confidences.validatePermissions(
        components.reference.repositories.ucans,
        permissions
      )

      if (!ucan) {
        console.warn("The present UCANs did not satisfy the configured permissions.")
        return null
      }

      const accountDID = Ucan.rootIssuer(ucan)
      const validSecrets = await Confidences.validateSecrets(
        components.crypto,
        accountDID,
        permissions
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

  if (config.permissions) {
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


export async function gatherComponents(setup: Partial<Components> & Configuration): Promise<Components> {
  const config = extractConfig(setup)

  const manners = setup.manners || defaultMannersComponent(config)
  const crypto = setup.crypto || await defaultCryptoComponent(config.appInfo)
  const storage = setup.storage || defaultStorageComponent(config.appInfo)
  const reference = setup.reference || defaultReferenceComponent({ crypto, manners, storage })
  const depot = setup.depot || await defaultDepotComponent()
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


export function defaultAuthComponent({ crypto, reference, storage }: Auth.Dependents): Auth.Implementation {
  return FissionAuthWnfsProduction.implementation({
    crypto, reference, storage,
  })
}

export function defaultConfidencesComponent({ crypto, depot }: ConfidencesImpl.Dependents): ConfidencesImpl.Implementation {
  return FissionLobbyProduction.implementation({ crypto, depot })
}

export function defaultCryptoComponent(appInfo: AppInfo): Promise<Crypto.Implementation> {
  return BrowserCrypto.implementation({
    storeName: appId(appInfo),
    exchangeKeyName: "exchange-key",
    writeKeyName: "write-key"
  })
}

export function defaultDepotComponent(): Promise<Depot.Implementation> {
  return FissionIpfsProduction.implementation()
}

export function defaultMannersComponent(config: Configuration): Manners.Implementation {
  return ProperManners.implementation({
    configuration: config
  })
}

export function defaultReferenceComponent({ crypto, manners, storage }: Reference.Dependents): Reference.Implementation {
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