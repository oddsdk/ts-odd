import localforage from "localforage"

import * as Auth from "./auth.js"
import * as Events from "./events.js"
import * as Path from "./path/index.js"
import * as Cabinet from "./repositories/cabinet.js"
import * as CIDLog from "./repositories/cid-log.js"

import { Query } from "./authority/query.js"
import { Store } from "./common/crypto/store.js"
import { Account, Agent, Channel, DNS, Depot, Identifier, Manners, Storage } from "./components.js"
import { Components } from "./components.js"
import { AnnexParentType } from "./components/account/implementation.js"
import { RequestOptions } from "./components/authority/implementation.js"
import { Configuration, namespace } from "./configuration.js"
import { loadFileSystem } from "./fileSystem.js"
import { FileSystem } from "./fs/class.js"
import { addSampleData } from "./fs/data/sample.js"

/////////////////////
// IMPLEMENTATIONS //
/////////////////////

import * as FissionAccountsProduction from "./components/account/implementation/fission-production.js"
import * as WebCryptoAgent from "./components/agent/implementation/web-crypto-api.js"
import * as FissionWebSocketChannelProduction from "./components/channel/implementation/fission-production.js"
import * as FissionIpfsProduction from "./components/depot/implementation/fission-ipfs-production.js"
import * as DNSOverHTTPS from "./components/dns/implementation/dns-over-https.js"
import * as WebCryptoIdentifier from "./components/identifier/implementation/web-crypto-api.js"
import * as ProperManners from "./components/manners/implementation/base.js"
import * as IndexedDBStorage from "./components/storage/implementation/indexed-db.js"

////////////////
// RE-EXPORTS //
////////////////

export * from "./appInfo.js"
export * from "./common/types.js"
export * from "./common/version.js"
export * from "./components.js"
export * from "./configuration.js"

export * as path from "./path/index.js"

export { CID, decodeCID, encodeCID } from "./common/cid.js"
export { FileSystem } from "./fs/class.js"

///////////////////////
// TYPES & CONSTANTS //
///////////////////////

/**
 * The `Program` type.
 *
 * This will be your main interaction point with an ODD SDK program.
 * From here you can interact with the file system, manage your account,
 * and manage authority.
 *
 * The `Annex` type parameter is the type of `annex` part of the account
 * system implementation. Using a different account system could mean
 * you have different extensions located in the `program.account` object.
 */
export type Program<Annex extends Account.AnnexParentType> =
  & {
    /**
     * Manage the account.
     */
    account: Account.Implementation<Annex>["annex"] & {
      register: (formValues: Record<string, string>) => Promise<
        { ok: true } | { ok: false; reason: string }
      >
      canRegister: (formValues: Record<string, string>) => Promise<
        { ok: true } | { ok: false; reason: string }
      >
    }

    /**
     * Authority system.
     *
     * TODO: Unfinished
     */
    authority: {
      /**
       * Is my program allowed to do what I want to do?
       */
      isGranted: (query?: Query) => Promise<
        { granted: true } | { granted: false; reason: string }
      >

      provide: () => Promise<void>
      request: (options: RequestOptions) => Promise<void>
    }

    /**
     * Components used to build this program.
     */
    components: Components<Annex>

    /**
     * Configuration used to build this program.
     */
    configuration: Configuration

    /**
     * Various file system methods.
     */
    fileSystem: FileSystemShortHands
  }
  & Events.ListenTo<Events.All>

export enum ProgramError {
  InsecureContext = "INSECURE_CONTEXT",
  UnsupportedBrowser = "UNSUPPORTED_BROWSER",
}

export type FileSystemShortHands = {
  addSampleData: (fs: FileSystem) => Promise<void>

  /**
   * Load the file system associated with the account system.
   */
  load: (opts?: { local?: boolean }) => Promise<FileSystem>
}

//////////////////
// ENTRY POINTS //
//////////////////

/**
 * 🚀 Build an ODD program.
 *
 * This will give you a `Program` object which will your main interaction point.
 *
 * This gives you three systems to work with:
 * - `account`, the account system, use this to register an account.
 * - `authority`, the authority system, request or provide authority to parts of the (or entire) file system and account system.
 * - `fileSystem`, the file system.
 *
 * This object also has a few other functions, for example to load a filesystem.
 * These are called "shorthands" because they're the same functions available
 * through other places in the ODD SDK, but you don't have to pass in the components.
 *
 * See `assemble` for more information. Note that this function checks for browser support,
 * while `assemble` does not. Use the latter in case you want to bypass the indexedDB check,
 * which might not be needed, or available, in certain environments or using certain components.
 */
export async function program<Annex extends AnnexParentType>(
  settings: Partial<Components<Annex>> & { account: Account.Implementation<Annex> } & Configuration
): Promise<Program<Annex>>
export async function program(
  settings: Partial<Omit<Components<FissionAccountsProduction.Annex>, "account">> & Configuration
): Promise<Program<FissionAccountsProduction.Annex>>
export async function program(
  settings: Partial<Components<any>> & Configuration
): Promise<Program<any>> {
  if (!settings) {
    throw new Error(
      "Expected a settings object of the type `Partial<Components> & Configuration` as the first parameter"
    )
  }

  // Check if the browser and context is supported
  if (globalThis.isSecureContext === false) throw ProgramError.InsecureContext
  if (await isSupported() === false) throw ProgramError.UnsupportedBrowser

  // Initialise components & assemble program
  const components = await gatherComponents(settings)
  return assemble(extractConfig(settings), components)
}

///////////////////////////
// PREDEFINED COMPONENTS //
///////////////////////////

/**
 * Predefined account configurations.
 */
export const account = {
  /**
   * Fission's account system.
   */
  fission() {
    //
  },

  /**
   * An account system that doesn't actually do anything.
   * Can be used to test various account-related things locally.
   */
  localOnly() {
    //
  },
}

//////////////
// ASSEMBLE //
//////////////

/**
 * Build an ODD Program based on a given set of `Components`.
 * These are various customisable components that determine how an ODD app works.
 * Use `program` to work with a default, or partial, set of components.
 *
 * Additionally this does a few other things:
 * - Loads the user's file system if needed.
 * - Provides shorthands to functions so you don't have to pass in components.
 * - Enables the ODD extension.
 *
 * See the `program.fileSystem.load` function if you want to load the user's file system yourself.
 */
export async function assemble<Annex extends AnnexParentType>(
  config: Configuration,
  components: Components<Annex>
): Promise<Program<Annex>> {
  const { account, agent, identifier } = components

  // Event emitters
  const fsEvents = Events.createEmitter<Events.FileSystem>()
  const allEvents = fsEvents

  // Create repositories
  const cidLog = await CIDLog.create({ storage: components.storage })
  const cabinet = await Cabinet.create({ storage: components.storage })

  cabinet.events.on("collection:changed", async ({ collection }) => {
    await components.manners.cabinet.hooks.inventoryChanged(collection)
  })

  // Authority
  const authority = {
    async isGranted(query?: Query): Promise<{ granted: true } | { granted: false; reason: string }> {
      // TODO:
      // This should take the query in consideration.

      const ucanDictionary = { ...cabinet.ucansIndexedByCID }

      // Audience is always the identifier here,
      // the account system should delegate to the identifier (not the agent)
      const audience = await components.identifier.did()
      const identifierUcans = cabinet.audienceUcans(audience)

      // TODO: Do we need something like `account.hasSufficientCapabilities()` here?
      //       Something that would check if all needed capabilities are present?
      //
      //       Also need to check if we can write to the entire file system.
      const canUpdateDataRoot = await components.account.canUpdateDataRoot(identifierUcans, ucanDictionary)
      if (!canUpdateDataRoot) {
        return {
          granted: false,
          reason: "Program does not have the ability to update the data root, but is expected to.",
        }
      }

      // Check file system access
      if (cabinet.hasAccessKey(Path.directory("private")) === false) {
        return {
          granted: false,
          reason: "Program does not have write access to the root private node, but is expected to.",
        }
      }

      // Fin
      return { granted: true }
    },

    // TODO:
    async provide() {},
    async request() {},
  }

  // Shorthands
  const fileSystemShortHands: FileSystemShortHands = {
    addSampleData: (fs: FileSystem) => addSampleData(fs),
    load: (opts) => loadFileSystem({ cidLog, cabinet, dependencies: components, eventEmitter: fsEvents, ...opts }),
  }

  // Create `Program`
  const program = {
    ...Events.listenTo(allEvents),

    configuration: { ...config },
    fileSystem: { ...fileSystemShortHands },

    components,

    authority,
    account: {
      register: Auth.register({ account, agent, identifier, cabinet }),
      canRegister: account.canRegister,

      ...components.account.annex,
    },
  }

  // Debug mode:
  // - Enable ODD extensions (if configured)
  // - Inject into global context (if configured)
  if (config.debug) {
    const inject = config.debug === true || config.debug?.injectIntoGlobalContext === undefined
      ? true
      : config.debug?.injectIntoGlobalContext

    if (inject) {
      const container = globalThis as any
      container.__odd = container.__odd || {}
      container.__odd.programs = container.__odd.programs || {}
      container.__odd.programs[namespace(config)] = program
    }

    // TODO: Re-enable extension
    //
    // const emitMessages = config.debugging?.emitWindowPostMessages === undefined
    //   ? true
    //   : config.debugging?.emitWindowPostMessages

    // if (emitMessages) {
    //   const { connect, disconnect } = await Extension.create({
    //     namespace: config.namespace,
    //     capabilities: config.permissions,
    //     dependencies: components,
    //     eventEmitters: {
    //       fileSystem: fsEvents
    //     }
    //   })

    //   const container = globalThis as any
    //   container.__odd = container.__odd || {}
    //   container.__odd.extension = container.__odd.extension || {}
    //   container.__odd.extension.connect = connect
    //   container.__odd.extension.disconnect = disconnect

    //   // Notify extension that the ODD SDK is ready
    //   globalThis.postMessage({
    //     id: "odd-devtools-ready-message",
    //   })
    // }
  }

  // Fin
  return program
}

//////////////////
// COMPOSITIONS //
//////////////////

/**
 * Full component sets.
 */
export const compositions = {
  /**
   * The default Fission stack using web crypto auth.
   */
  async fission(
    settings: Configuration & {
      environment?: string
    }
  ) {
    // TODO
  },
}

/**
 * Create a component set given any combination of components.
 * Uses the default-components set to fill in the missing ones.
 */
export async function gatherComponents<Annex extends AnnexParentType>(
  setup: Partial<Components<Annex>> & { account: Account.Implementation<Annex> } & Configuration
): Promise<Components<Annex>>
export async function gatherComponents(
  setup: Partial<Omit<Components<FissionAccountsProduction.Annex>, "account">> & Configuration
): Promise<Components<FissionAccountsProduction.Annex>>
export async function gatherComponents(
  setup: Partial<Components<any>> & Configuration
): Promise<Components<any>> {
  const config = extractConfig(setup)
  const storageName = namespace(config)

  const dns = setup.dns || defaultComponents.dns()
  const manners = setup.manners || defaultComponents.manners(config)
  const storage = setup.storage || defaultComponents.storage(storageName)

  const agentStore = defaultComponents.storage(`${storageName}/agent`)
  const identifierStore = defaultComponents.storage(`${storageName}/identifier`)

  const agent = setup.agent || await defaultComponents.agent(config, { store: agentStore })
  const identifier = setup.identifier || await defaultComponents.identifier(config, { store: identifierStore })
  const account = setup.account || defaultComponents.account({ agent, dns, manners })

  const channel = setup.channel || defaultComponents.channel()
  const depot = setup.depot || await defaultComponents.depot({ storage }, config)

  return {
    account,
    agent,
    channel,
    depot,
    dns,
    identifier,
    manners,
    storage,
  }
}

////////////////////////
// DEFAULT COMPONENTS //
////////////////////////

export const defaultComponents = {
  account(
    { agent, dns, manners }: {
      agent: Agent.Implementation
      dns: DNS.Implementation
      manners: Manners.Implementation<FileSystem>
    }
  ): Account.Implementation<FissionAccountsProduction.Annex> {
    return FissionAccountsProduction.implementation({ agent, dns, manners })
  },

  agent(
    config: Configuration,
    { store }: { store: Store }
  ): Promise<Agent.Implementation> {
    return WebCryptoAgent.implementation({
      store,
    })
  },

  channel(): Channel.Implementation {
    return FissionWebSocketChannelProduction.implementation()
  },

  depot(
    { storage }: { storage: Storage.Implementation },
    config: Configuration
  ): Promise<Depot.Implementation> {
    return FissionIpfsProduction.implementation(
      storage,
      `${namespace(config)}/blockstore`
    )
  },

  dns(): DNS.Implementation {
    return DNSOverHTTPS.implementation()
  },

  identifier(
    config: Configuration,
    { store }: { store: Store }
  ): Promise<Identifier.Implementation> {
    return WebCryptoIdentifier.implementation({
      store,
    })
  },

  manners(config: Configuration): Manners.Implementation<FileSystem> {
    return ProperManners.implementation({
      configuration: config,
    })
  },

  storage(name: string): Storage.Implementation {
    return IndexedDBStorage.implementation({ name })
  },
}

////////
// 🛟 //
////////

/**
 * Is this browser supported?
 */
export async function isSupported(): Promise<boolean> {
  return localforage.supports(localforage.INDEXEDDB)
    // Firefox in private mode can't use indexedDB properly,
    // so we test if we can actually make a database.
    && await (() =>
      new Promise(resolve => {
        const db = indexedDB.open("testDatabase")
        db.onsuccess = () => resolve(true)
        db.onerror = () => resolve(false)
      }))() as boolean
}

////////
// 🛠 //
////////

export function extractConfig<Annex extends AnnexParentType>(
  opts: Partial<Components<Annex>> & Configuration
): Configuration {
  return {
    namespace: opts.namespace,
    debug: opts.debug,
    fileSystem: opts.fileSystem,
    userMessages: opts.userMessages,
  }
}
