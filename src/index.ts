import localforage from "localforage"

import * as Auth from "./auth.js"
import * as Events from "./events.js"
import * as Path from "./path/index.js"
import * as Cabinet from "./repositories/cabinet.js"
import * as CIDLog from "./repositories/cid-log.js"

import { Query } from "./access/query.js"
import { Account, Agent, Channel, DNS, Depot, Identifier, Manners, Storage } from "./components.js"
import { Components } from "./components.js"
import { RequestOptions } from "./components/access/implementation.js"
import { AnnexParentType } from "./components/account/implementation.js"
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

export * as Path from "./path/index.js"

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
 * and do access control.
 *
 * The `Annex` type parameter is the type of `annex` part of the account
 * system implementation. Using a different account system could mean
 * you have different extensions located in the `program.account` object.
 */
export type Program<Annex extends Account.AnnexParentType> =
  & {
    /**
     * Access control system.
     *
     * TODO: Unfinished
     */
    access: {
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
 * This will give you a `Program` object which will your main interaction point.
 *
 * This gives you three systems to work with:
 * - `access`, the access control system, request or provide access to parts of the file system and account system.
 * - `account`, the account system, use this to register an account.
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
  settings: Partial<Components<Annex>> & { account: Account.Implementation<Annex> } & Configuration,
): Promise<Program<Annex>>
export async function program(
  settings: Partial<Omit<Components<FissionAccountsProduction.Annex>, "account">> & Configuration,
): Promise<Program<FissionAccountsProduction.Annex>>
export async function program(
  settings: Partial<Components<any>> & Configuration,
): Promise<Program<any>> {
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
 * - Provides shorthands to functions so you don't have to pass in components.
 * - Enables the ODD extension.
 *
 * See the `program.fileSystem.load` function if you want to load the user's file system yourself.
 */
export async function assemble<Annex extends AnnexParentType>(
  config: Configuration,
  components: Components<Annex>,
): Promise<Program<Annex>> {
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
  // TODO: Fission stack
}

export async function gatherComponents<Annex extends AnnexParentType>(
  setup: Partial<Components<Annex>> & { account: Account.Implementation<Annex> } & Configuration,
): Promise<Components<Annex>>
export async function gatherComponents(
  setup: Partial<Omit<Components<FissionAccountsProduction.Annex>, "account">> & Configuration,
): Promise<Components<FissionAccountsProduction.Annex>>
export async function gatherComponents(
  setup: Partial<Components<any>> & Configuration,
): Promise<Components<any>> {
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
): Account.Implementation<FissionAccountsProduction.Annex> {
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

export function extractConfig<Annex extends AnnexParentType>(
  opts: Partial<Components<Annex>> & Configuration,
): Configuration {
  return {
    namespace: opts.namespace,
    debug: opts.debug,
    fileSystem: opts.fileSystem,
    userMessages: opts.userMessages,
  }
}
