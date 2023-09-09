/**
 * Documentation for `@oddjs/odd`.
 *
 * ```
 * import * as local from "@oddjs/odd/compositions/local"
 * import * as odd from "@oddjs/odd"
 *
 * const config = { namespace: "odd-example" }
 *
 * odd.program(
 *   config,
 *   await local.components(config)
 * )
 * ```
 * @module odd
 */

import * as Auth from "./auth.js"
import * as AuthorityEvents from "./events/authority.js"
import * as Events from "./events/program.js"
import * as Path from "./path/index.js"
import * as Cabinet from "./repositories/cabinet.js"
import * as Names from "./repositories/names.js"

import { FileSystemQuery, Query } from "./authority/query.js"
import { Account } from "./components.js"
import { Components } from "./components.js"
import { AnnexParentType } from "./components/account/implementation.js"
import { RequestOptions } from "./components/authority/implementation.js"
import { Configuration, namespace } from "./configuration.js"
import { createEmitter } from "./events/emitter.js"
import { ListenTo, listenTo } from "./events/listen.js"
import { loadFileSystem } from "./fileSystem.js"
import { FileSystem } from "./fs/class.js"
import { addSampleData } from "./fs/data/sample.js"
import { FileSystemCarrier } from "./fs/types.js"
import { Inventory } from "./inventory.js"

////////////////
// RE-EXPORTS //
////////////////

export * from "./appInfo.js"
export * from "./common/types.js"
export * from "./common/version.js"
export * from "./components.js"
export * from "./configuration.js"
export * from "./fs/types.js"

export * as authority from "./authority/query.js"
export * as channel from "./channel.js"
export * as events from "./events/index.js"
export * as path from "./path/index.js"

export { CID, decodeCID, encodeCID } from "./common/cid.js"
export { Components } from "./components.js"
export { RequestOptions } from "./components/authority/implementation.js"
export { CodecIdentifier } from "./dag/codecs.js"
export { FileSystem } from "./fs/class.js"
export { TransactionContext } from "./fs/transaction.js"
export { Inventory } from "./inventory.js"
export { Names } from "./repositories/names.js"
export { Ticket } from "./ticket/types.js"

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
 *
 * @group 🚀
 */
export type Program<
  Annex extends Account.AnnexParentType,
  AuthorityProvideResponse,
  AuthorityRequestResponse,
> =
  & {
    /**
     * {@inheritDoc AccountCategory}
     */
    account: AccountCategory<Annex>

    /**
     * {@inheritDoc AuthorityCategory}
     */
    authority: AuthorityCategory<
      AuthorityProvideResponse,
      AuthorityRequestResponse
    >

    /**
     * Components used to build this program.
     */
    components: Components<
      Annex,
      AuthorityProvideResponse,
      AuthorityRequestResponse
    >

    /**
     * Configuration used to build this program.
     */
    configuration: Configuration

    /**
     * {@inheritDoc FileSystemCategory}
     */
    fileSystem: FileSystemCategory

    /**
     * {@inheritDoc IdentityCategory}
     */
    identity: IdentityCategory
  }
  & ListenTo<Events.Program>

////////////////////////
// PROGRAM CATEGORIES //
////////////////////////

/**
 * Account system.
 *
 * @group Program
 */
export type AccountCategory<Annex extends AnnexParentType> = ReturnType<Account.Implementation<Annex>["annex"]> & {
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
 * @group Program
 */
export type AuthorityCategory<ProvideResponse, RequestResponse> = {
  /**
   * Does my program have the authority to work with these part of the file system?
   * And does the configured account system have the required authority?
   */
  has: (fileSystemQueries: Query | (Query | Query[])[]) => Promise<
    { has: true } | { has: false; reason: string }
  >

  provide: (queries: Query | (Query | Query[])[]) => Promise<ProvideResponse>
  request: (queries: Query | (Query | Query[])[], options: RequestOptions) => Promise<RequestResponse | null>
} & ListenTo<AuthorityEvents.Authority>

/**
 * File system.
 *
 * @group Program
 */
export type FileSystemCategory = {
  /**
   * Add some sample data to a file system.
   */
  addSampleData: (fs: FileSystem) => Promise<void>

  /**
   * Load a file system.
   *
   * ```
   * // Empty file system
   * program.fileSystem.load({ did: "did:some-identifier" })
   *
   * // Existing file system
   * program.fileSystem.load({ dataRoot: cid, did: "did:some-identifier" })
   *
   * // Existing file system that updates external data-root pointer when mutation occurs (and publishing is not disabled)
   * const updateFn = (dataRoot, proofs) => updateRemoteDataRoot(...)
   * program.fileSystem.load({ dataRoot: cid, dataRootUpdater: updateFn, did: "did:some-identifier" })
   * ```
   */
  load: (params: FileSystemCarrier) => Promise<FileSystem>
}

/**
 * Identity system.
 *
 * @group Program
 */
export type IdentityCategory = {
  account: () => Promise<string | null>
  agent: () => Promise<string>
  identifier: () => Promise<string>
}

//////////////////
// ENTRY POINTS //
//////////////////

/**
 * Build an ODD program.
 *
 * This will give you a `Program` object which will your main interaction point.
 *
 * This gives you three systems to work with:
 * - `account`, the account system, use this to register an account.
 * - `authority`, the authority system, request or provide authority to parts of (or the entire) file system and account system.
 * - `fileSystem`, the file system.
 *
 * An ODD program revolves around two main things, the file system (WNFS) and authorization (UCANs).
 * Both of these can be used entirely locally without depending on an external service.
 *
 * We've built components that can be swapped out with different
 * implementations. For example, the file system consists out of IPLD blocks,
 * how these blocks are stored and/or synced remotely is determined by the `depot` component.
 * You could have an implementation that just stores the blocks in memory and forgets
 * about them on page reload, or you could store the blocks in indexedDB and connect
 * to an IPFS peer that will fetch the blocks.
 *
 * @group 🚀
 */
export async function program<
  Annex extends AnnexParentType,
  AuthorityProvideResponse,
  AuthorityRequestResponse,
>(
  config: Configuration,
  components: Components<
    Annex,
    AuthorityProvideResponse,
    AuthorityRequestResponse
  >
): Promise<
  Program<
    Annex,
    AuthorityProvideResponse,
    AuthorityRequestResponse
  >
> {
  const { account, agent, authority, channel, clerk, identifier } = components

  // Is supported?
  await Promise.all(
    [components.storage].map(async component => {
      const result = await component.isSupported()
      if (!result.supported) throw new Error(result.reason)
    })
  )

  // Create repositories
  const cabinet = await Cabinet.create({ storage: components.storage })
  const names = await Names.create({ storage: components.storage })

  const inventory = new Inventory(components.clerk, cabinet)

  cabinet.events.on("collection:changed", async ({ collection }) => {
    // TODO: emit authority:inventory-changed event
    // NOTE: This event exists so that UCANs can be stored encrypted on WNFS when using passkeys
  })

  // Authority
  const authorityEmitter = createEmitter<AuthorityEvents.Authority>()
  const authorityCategory: AuthorityCategory<
    AuthorityProvideResponse,
    AuthorityRequestResponse
  > = {
    async has(
      query: Query | (Query | Query[])[]
    ): Promise<{ has: true } | { has: false; reason: string }> {
      const queries = (Array.isArray(query) ? query : [query]).flat()

      // Account access
      if (queries.some(q => q.query === "account")) {
        const accountAccess = await account.hasSufficientAuthority(identifier, inventory)
        if (!accountAccess.suffices) {
          return {
            has: false,
            reason: accountAccess.reason,
          }
        }
      }

      // File system access
      const fsQueries = queries.reduce(
        (acc: FileSystemQuery[], q) => {
          if (q.query === "fileSystem") return [...acc, q]
          return acc
        },
        []
      )

      const hasAccessToFsPaths = fsQueries.filter(q => Path.isPartition("private", q.path)).reduce(
        (acc, query) => {
          if (acc === false) return false
          const did = names.resolveId(query.id)
          if (!did) return false
          return cabinet.hasAccessKey(did, query.path)
        },
        true
      )

      if (!hasAccessToFsPaths) {
        return {
          has: false,
          reason: "Program does not have write access to all the given paths.",
        }
      }

      // Fin
      return { has: true }
    },

    async provide(query: Query | (Query | Query[])[]): Promise<AuthorityProvideResponse> {
      const queries = (Array.isArray(query) ? query : [query]).flat()

      return authority.provide({
        dependencies: {
          account,
          channel,
          clerk,
          identifier,
        },
        eventEmitter: authorityEmitter,
        inventory,
        queries,
        names,
      })
    },

    async request(
      query: Query | (Query | Query[])[],
      options: RequestOptions
    ): Promise<AuthorityRequestResponse | null> {
      const queries = (Array.isArray(query) ? query : [query]).flat()
      const response = await authority.request({
        dependencies: {
          channel,
          identifier,
        },
        eventEmitter: authorityEmitter,
        options,
        queries,
      })

      if (response) {
        const accountTickets = response.accountTickets.map(i => i.tickets).flat()
        const fileSystemTickets = response.fileSystemTickets.map(i => i.tickets).flat()

        await cabinet.addTickets("account", accountTickets, clerk.tickets.cid)
        await cabinet.addTickets("file_system", fileSystemTickets, clerk.tickets.cid)
        await cabinet.addAccessKeys(response.accessKeys)

        const identifierAccountTickets = accountTickets.filter(
          t => t.audience === identifier.did()
        )

        if (identifierAccountTickets.length) {
          // Do delegation from identifier to agent
          const agentDelegation = await clerk.tickets.misc.identifierToAgentDelegation(
            identifier,
            agent,
            identifierAccountTickets
          )

          await cabinet.addTicket("agent", agentDelegation, clerk.tickets.cid)
        }

        await names.add(
          Object.entries(response.resolvedNames).map(([k, v]) => {
            return { name: k, subject: v }
          })
        )

        await authorityEmitter.emit("request:authorised", { queries: response.authorisedQueries })
        await authorityEmitter.emit("request:authorized", { queries: response.authorisedQueries })

        return response.requestResponse
      }

      return null
    },

    ...listenTo(authorityEmitter),
  }

  // Other categories
  const fileSystemCategory: FileSystemCategory = {
    addSampleData: (fs: FileSystem) => addSampleData(fs),
    load: async (params: FileSystemCarrier) => {
      return loadFileSystem({ cabinet, names, carrier: params, dependencies: components })
    },
  }

  const identityCategory: IdentityCategory = {
    async account(): Promise<string | null> {
      return account.did(identifier, inventory)
    },
    async agent() {
      return agent.did()
    },
    async identifier() {
      return identifier.did()
    },
  }

  // Create `Program`
  const program = {
    ...listenTo(components.manners.program.eventEmitter),

    components,

    configuration: { ...config },

    // Categories
    authority: authorityCategory,
    identity: identityCategory,
    fileSystem: fileSystemCategory,

    account: {
      register: Auth.register({ account, agent, clerk, identifier, cabinet, names }),
      canRegister: account.canRegister,

      ...components.account.annex(identifier, inventory, names),
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
