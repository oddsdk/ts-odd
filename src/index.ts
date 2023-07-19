import type { Annex as FissionAccountsAnnex } from "./components/account/implementation/fission-base.js"

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
 * - `account`, the account system, use this to register an account.
 * - `authority`, the authority system, request or provide authority to parts of (or the entire) file system and account system.
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
  settings: Partial<Omit<Components<FissionAccountsAnnex>, "account">> & Configuration
): Promise<Program<FissionAccountsAnnex>>
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
 *
 * An account system is responsible for user accounts and
 * having a location for where the data root is stored.
 * This allows for the file system to be loaded on another device,
 * even if the related devices are offline.
 */
export const account = {
  /**
   * Fission's account system.
   */
  async fission(settings: {
    environment?: string

    // Dependencies
    agent: Agent.Implementation
    dns: DNS.Implementation
    manners: Manners.Implementation<FileSystem>
  }): Promise<Account.Implementation<FissionAccountsAnnex>> {
    const env = settings?.environment || "production"
    const { agent, dns, manners } = settings
    const { implementation } = await import(`./components/account/implementation/fission-${env}.js`)

    return implementation({
      agent,
      dns,
      manners,
    })
  },

  /**
   * An account system that doesn't actually do anything.
   * Can be used to test various account-related things locally.
   */
  async localOnly(): Promise<Account.Implementation<Record<string, never>>> {
    const { implementation } = await import("./components/account/implementation/local-only.js")
    return implementation()
  },
}

/**
 * Predefined agent configurations.
 *
 * The agent is responsible for signing UCANs that are sent
 * to other services. This is not done by the identifier so
 * that the identifier doesn't need to sign things each time.
 * The reason this is useful is because an identifier might need to ask
 * the user for permission to sign, whereas the agent does not.
 * That means the user isn't bothered with popups every few minutes
 * when for example the remote data root is updated.
 */
export const agent = {
  /**
   * An agent implementation using the Web Crypto API,
   * using non-exportable keys.
   */
  async webCryptoAPI({ store }: { store: Store }): Promise<Agent.Implementation> {
    const { implementation } = await import("./components/agent/implementation/web-crypto-api.js")
    return implementation({ store })
  },
}

/**
 * Predefined authority configurations.
 *
 * Reponsible for providing and requesting authority.
 * Which technically means providing and requesting UCANs and file system secrets.
 */
export const authority = {}

/**
 * Predefined channel configurations.
 *
 * A channel serves as a transport between multiple devices,
 * used to transfer UCANs and file system secrets, but also,
 * to notify other devices of file system changes.
 */
export const channel = {
  /**
   * Use Fission's websocket channel.
   */
  async fission(settings?: {
    environment?: string
  }): Promise<Channel.Implementation> {
    const env = settings?.environment || "production"
    const { implementation } = await import(`./components/channel/implementation/fission-${env}.js`)
    return implementation()
  },
}

/**
 * Predefined depot configurations.
 *
 * This is the component responsible for getting
 * IPLD blocks in and out of the system.
 */
export const depot = {
  /**
   * Uses HTTP to fetch blocks and IPFS bitswap to upload blocks.
   * Using Fission's IPFS nodes.
   */
  async fissionBitswapIPFS(
    settings: Configuration & {
      environment?: string

      // Dependencies
      storage: Storage.Implementation
    }
  ): Promise<Depot.Implementation> {
    const env = settings.environment || "production"
    const storageName = namespace(settings)

    const { implementation } = await import(`./components/depot/implementation/fission-ipfs-${env}.js`)

    return implementation(
      settings.storage,
      `${storageName}/blockstore`
    )
  },
}

/**
 * Predefined DNS configurations.
 *
 * Determines how to look up various DNS records.
 */
export const dns = {
  /**
   * Look up DNS using HTTPS (Cloudflare & Google)
   */
  async doh(): Promise<DNS.Implementation> {
    const { implementation } = await import("./components/dns/implementation/dns-over-https.js")
    return implementation()
  },
}

/**
 * Predefined identifier configurations.
 *
 * This component signifies one of the user's identifiers.
 * Their identifier is used in conjunction with the account system and the agent.
 *
 * Identifier delegates to agent, agent contacts remote account service,
 * account service issues UCANs addressed to identifier.
 * Those UCANs are then used throughout the SDK to check for capabilities, etc.
 *
 * Also see `agent` description.
 */
export const identifier = {
  async webCryptoAPI({ store }: { store: Store }): Promise<Identifier.Implementation> {
    const { implementation } = await import("./components/identifier/implementation/web-crypto-api.js")
    return implementation({ store })
  },
}

/**
 * Predefined manners configurations.
 *
 * The manners component allows you to tweak various behaviours of an ODD program,
 * such as logging and file system hooks (eg. what to do after a new file system is created).
 */
export const manners = {
  /**
   * The default ODD SDK behaviour.
   */
  async default(settings: Configuration): Promise<Manners.Implementation<FileSystem>> {
    const { implementation } = await import("./components/manners/implementation/default.js")
    return implementation({ configuration: settings })
  },
}

/**
 * Predefined storage configurations.
 *
 * A key-value storage abstraction responsible for storing various
 * pieces of data, such as UCANs and crypto keys (depending on other components used).
 */
export const storage = {
  /**
   * IndexedDB through the `localForage` library, automatically namespaced.
   */
  async indexedDB(settings: { name: string }): Promise<Storage.Implementation> {
    const { implementation } = await import("./components/storage/implementation/indexed-db.js")
    return implementation(settings)
  },

  /**
   * In-memory store.
   */
  async memory(): Promise<Storage.Implementation> {
    const { implementation } = await import("./components/storage/implementation/memory.js")
    return implementation()
  },
}

//////////////
// ASSEMBLE //
//////////////

/**
 * Build an ODD Program based on a given set of `Components`.
 * These are various customisable components that determine how an ODD app works.
 * Use `program` to work with a default, or partial, set of components.
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
    // TODO: emit authority:inventory-changed event
    // NOTE: This event exists so that UCANs can be stored encrypted on WNFS when using passkeys
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
    load: () => loadFileSystem({ cidLog, cabinet, dependencies: components, eventEmitter: fsEvents }),
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
   * The default Fission stack using web crypto auth and IPFS.
   */
  async fission(
    settings: Configuration & {
      environment?: string
    }
  ) {
    const config = extractConfig(settings)

    const components = {
      agent: await defaultComponents.agent(config),
      channel: await channel.fission(settings),
      dns: await defaultComponents.dns(),
      identifier: await defaultComponents.identifier(config),
      manners: await defaultComponents.manners(config),
      storage: await defaultComponents.storage(config),
    }

    const _depot = await depot.fissionBitswapIPFS({ ...settings, storage: components.storage })
    const _account = await account.fission({ ...settings, ...components })

    return {
      agent: components.agent,
      channel: components.channel,
      dns: components.dns,
      identifier: components.identifier,
      manners: components.manners,
      storage: components.storage,

      account: _account,
      depot: _depot,
    }
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
  setup: Partial<Omit<Components<FissionAccountsAnnex>, "account">> & Configuration
): Promise<Components<FissionAccountsAnnex>>
export async function gatherComponents(
  setup: Partial<Components<any>> & Configuration
): Promise<Components<any>> {
  const config = extractConfig(setup)

  const agent = setup.agent || await defaultComponents.agent(config)
  const channel = setup.channel || await defaultComponents.channel()
  const dns = setup.dns || await defaultComponents.dns()
  const identifier = setup.identifier || await defaultComponents.identifier(config)
  const manners = setup.manners || await defaultComponents.manners(config)
  const storage = setup.storage || await defaultComponents.storage(config)

  const depot = setup.depot || await defaultComponents.depot({ ...config, storage })
  const account = setup.account || await defaultComponents.account({ agent, dns, manners })

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
  account(settings: {
    agent: Agent.Implementation
    dns: DNS.Implementation
    manners: Manners.Implementation<FileSystem>
  }): Promise<Account.Implementation<FissionAccountsAnnex>> {
    return account.fission(settings)
  },

  async agent(config: Configuration): Promise<Agent.Implementation> {
    const store = await storage.indexedDB({ name: `${namespace(config)}/agent` })
    return agent.webCryptoAPI({ store })
  },

  channel(): Promise<Channel.Implementation> {
    return channel.fission()
  },

  depot(settings: Configuration & { storage: Storage.Implementation }): Promise<Depot.Implementation> {
    return depot.fissionBitswapIPFS(settings)
  },

  dns(): Promise<DNS.Implementation> {
    return dns.doh()
  },

  async identifier(config: Configuration): Promise<Identifier.Implementation> {
    const store = await storage.indexedDB({ name: `${namespace(config)}/identifier` })
    return identifier.webCryptoAPI({ store })
  },

  manners(config: Configuration): Promise<Manners.Implementation<FileSystem>> {
    return manners.default(config)
  },

  storage(config: Configuration): Promise<Storage.Implementation> {
    return storage.indexedDB({ name: namespace(config) })
  },
}

////////
// 🛟 //
////////

/**
 * Is this browser supported?
 */
export async function isSupported(): Promise<boolean> {
  // Firefox in private mode can't use indexedDB properly,
  // so we test if we can actually make a database.
  try {
    return await new Promise(resolve => {
      const db = indexedDB.open("testDatabase")
      db.onsuccess = () => resolve(true)
      db.onerror = () => resolve(false)
    })
  } catch {
    console.warn("IndexedDB is not supported")
    return false
  }
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
