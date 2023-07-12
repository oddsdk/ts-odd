import localforage from "localforage"

import * as Auth from "./auth.js"
import * as Events from "./events.js"
import * as Cabinet from "./repositories/cabinet.js"
import * as CIDLog from "./repositories/cid-log.js"

import { Account, Agent, Channel, DNS, Depot, Identifier, Manners, Storage } from "./components.js"
import { Components } from "./components.js"
import { RequestOptions } from "./components/access/implementation.js"
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
export * from "./common/cid.js"
export * from "./common/types.js"
export * from "./common/version.js"
export * from "./components.js"
export * from "./configuration.js"

export * as fission from "./common/fission.js"
export * as path from "./path/index.js"

export { FileSystem } from "./fs/class.js"

///////////////////////
// TYPES & CONSTANTS //
///////////////////////

export type Program =
  & {
    /**
     * Access control system.
     */
    access: {
      // TODO
      isGranted: () => Promise<
        { granted: true } | { granted: false; reason: string }
      >

      provide: () => Promise<void>
      request: (options: RequestOptions) => Promise<void>
    }

    /**
     * Manage the account.
     */
    account: {
      isConnected(): Promise<
        { connected: true } | { connected: false; reason: string }
      >

      login: (formValues: Record<string, string>) => Promise<
        { ok: true } | { ok: false; reason: string }
      >

      register: (formValues: Record<string, string>) => Promise<
        { ok: true } | { ok: false; reason: string }
      >
      canRegister: (formValues: Record<string, string>) => Promise<
        { ok: true } | { ok: false; reason: string }
      >
    }

    /**
     * Components used to build this program.
     */
    components: Components

    /**
     * Configuration used to build this program.
     */
    configuration: Configuration

    /**
     * Various file system methods.
     */
    fileSystem: FileSystemShortHands
  }
  & ShortHands
  & Events.ListenTo<Events.All>

export enum ProgramError {
  InsecureContext = "INSECURE_CONTEXT",
  UnsupportedBrowser = "UNSUPPORTED_BROWSER",
}

export type ShortHands = {}

export type FileSystemShortHands = {
  addSampleData: (fs: FileSystem) => Promise<void>

  /**
   * Load the file system associated with the account system.
   */
  load: () => Promise<FileSystem>
}

//////////////////
// ENTRY POINTS //
//////////////////

/**
 * 🚀 Build an ODD program.
 *
 * This will give you a `Program` object which has the following properties:
 * - `auth`, a means to login or register an account.
 * - `capabilities`, a means to control capabilities. Use this to collect & request capabilities. Read more about capabilities in the toplevel `capabilities` object documentation.
 * - `components`, your full set of `Components`.
 *
 * This object also has a few other functions, for example to load a filesystem.
 * These are called "shorthands" because they're the same functions available
 * through other places in the ODD SDK, but you don't have to pass in the components.
 *
 * See `assemble` for more information. Note that this function checks for browser support,
 * while `assemble` does not. Use the latter in case you want to bypass the indexedDB check,
 * which might not be needed, or available, in certain environments or using certain components.
 */
export async function program(settings: Partial<Components> & Configuration): Promise<Program> {
  if (!settings) {
    throw new Error(
      "Expected a settings object of the type `Partial<Components> & Configuration` as the first parameter",
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

// TODO: Add back predefined components

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
 * - Attempts to collect capabilities if the configuration has permissions.
 * - Provides shorthands to functions so you don't have to pass in components.
 * - Ensure backwards compatibility with older ODD SDK clients.
 *
 * See the `program.fileSystem.load` function if you want to load the user's file system yourself.
 */
export async function assemble(config: Configuration, components: Components): Promise<Program> {
  const { account, agent, identifier } = components

  // Event emitters
  const fsEvents = Events.createEmitter<Events.FileSystem>()
  const allEvents = fsEvents

  // Create repositories
  const cidLog = await CIDLog.create({ storage: components.storage })
  const cabinet = await Cabinet.create({ storage: components.storage })

  cabinet.events.on("collection:changed", ({ collection }) => {
    components.manners.cabinet.hooks.inventoryChanged(collection)
  })

  // Access
  const access = {
    // TODO: Needs to check if it can update the data root IF write access has been requested too.
    isGranted: async () => ({ granted: false, reason: "Not implemented just yet" }),

    // TODO
    provide: async () => {},
    request: async () => {},
  }

  // Account
  async function isConnected(): Promise<
    { connected: true } | { connected: false; reason: string }
  > {
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
        connected: false,
        reason: "Program does not have the ability to update the data root, but is expected to.",
      }
    }

    return { connected: true }
  }

  // Shorthands
  const fileSystemShortHands: FileSystemShortHands = {
    addSampleData: (fs: FileSystem) => addSampleData(fs),
    load: () => loadFileSystem({ config, cidLog, cabinet, dependencies: components, eventEmitter: fsEvents }),
  }

  // Create `Program`
  const program = {
    ...Events.listenTo(allEvents),

    configuration: { ...config },
    fileSystem: { ...fileSystemShortHands },

    components,

    access,
    account: {
      login: Auth.login({ agent, identifier, cabinet }),
      register: Auth.register({ account, agent, identifier, cabinet }),

      canRegister: account.canRegister,

      isConnected,
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
  // TODO: Fission stack
}

export async function gatherComponents(setup: Partial<Components> & Configuration): Promise<Components> {
  const config = extractConfig(setup)

  const dns = setup.dns || defaultDNSComponent()
  const manners = setup.manners || defaultMannersComponent(config)
  const storage = setup.storage || defaultStorageComponent(config)

  const agent = setup.agent || await defaultAgentComponent(config)
  const identifier = setup.identifier || await defaultIdentifierComponent(config)
  const account = setup.account || defaultAccountComponent({ agent, dns, manners })

  const channel = setup.channel || defaultChannelComponent()
  const depot = setup.depot || await defaultDepotComponent({ storage }, config)

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

export function defaultAccountComponent(
  { agent, dns, manners }: {
    agent: Agent.Implementation
    dns: DNS.Implementation
    manners: Manners.Implementation<FileSystem>
  },
): Account.Implementation {
  return FissionAccountsProduction.implementation({ agent, dns, manners })
}

export function defaultAgentComponent(
  config: Configuration,
): Promise<Agent.Implementation> {
  const store = localforage.createInstance({ name: `${namespace(config)}/agent` })

  return WebCryptoAgent.implementation({
    store,
  })
}

export function defaultChannelComponent(): Channel.Implementation {
  return FissionWebSocketChannelProduction.implementation()
}

export function defaultDepotComponent(
  { storage }: { storage: Storage.Implementation },
  config: Configuration,
): Promise<Depot.Implementation> {
  return FissionIpfsProduction.implementation(
    storage,
    `${namespace(config)}/blockstore`,
  )
}

export function defaultDNSComponent(): DNS.Implementation {
  return DNSOverHTTPS.implementation()
}

export function defaultIdentifierComponent(
  config: Configuration,
): Promise<Identifier.Implementation> {
  const store = localforage.createInstance({ name: `${namespace(config)}/identifier` })

  return WebCryptoIdentifier.implementation({
    store,
  })
}

export function defaultMannersComponent(config: Configuration): Manners.Implementation<FileSystem> {
  return ProperManners.implementation({
    configuration: config,
  })
}

export function defaultStorageComponent(config: Configuration): Storage.Implementation {
  return IndexedDBStorage.implementation({
    name: namespace(config),
  })
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

export function extractConfig(opts: Partial<Components> & Configuration): Configuration {
  return {
    namespace: opts.namespace,
    debug: opts.debug,
    fileSystem: opts.fileSystem,
    userMessages: opts.userMessages,
  }
}
