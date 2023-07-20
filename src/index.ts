import * as Auth from "./auth.js"
import * as Events from "./events.js"
import * as Path from "./path/index.js"
import * as Cabinet from "./repositories/cabinet.js"
import * as CIDLog from "./repositories/cid-log.js"

import { Query } from "./authority/query.js"
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
        { registered: true } | { registered: false; reason: string }
      >
      canRegister: (formValues: Record<string, string>) => Promise<
        { canRegister: true } | { canRegister: false; reason: string }
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
  & Shorthands
  & Events.ListenTo<Events.All>

export type Shorthands = {
  accountDID: () => Promise<string>
  agentDID: () => Promise<string>
  identifierDID: () => Promise<string>
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
  config: Configuration,
  components: Components<Annex>
): Promise<Program<Annex>> {
  const { account, agent, identifier } = components

  // Is supported?
  await Promise.all(
    [components.storage].map(async component => {
      const result = await component.isSupported()
      if (!result.supported) throw new Error(result.reason)
    })
  )

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

  const shortHands: Shorthands = {
    async accountDID(): Promise<string> {
      const audience = await components.identifier.did()
      const identifierUcans = cabinet.audienceUcans(audience)

      return components.account.did(identifierUcans, cabinet.ucansIndexedByCID)
    },

    async agentDID() {
      return components.agent.did()
    },

    async identifierDID() {
      return components.identifier.did()
    },
  }

  // Create `Program`
  const program = {
    ...Events.listenTo(allEvents),
    ...shortHands,

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
