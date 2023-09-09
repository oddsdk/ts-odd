/**
 * Documentation for `@oddjs/odd/compositions/fission`.
 *
 * ```
 * import * as fission from "@oddjs/odd/compositions/fission"
 * import * as odd from "@oddjs/odd"
 *
 * const config = { namespace: "odd-example" }
 *
 * odd.program(
 *   config,
 *   await fission.components(config)
 * )
 * ```
 * @module
 */

import * as Fission from "../common/fission.js"
import { Components } from "../components.js"
import { Configuration } from "../configuration.js"
import * as Config from "../configuration.js"

import * as Account from "../components/account/fission.js"
import * as Agent from "../components/agent/web-crypto-api.js"
import * as Authority from "../components/authority/browser-url.js"
import * as Channel from "../components/channel/fission.js"
import * as Clerk from "../components/clerk/default.js"
import * as Depot from "../components/depot/fission.js"
import * as DNS from "../components/dns/dns-over-https/fission.js"
import * as Identifier from "../components/identifier/web-crypto-api.js"
import * as Manners from "../components/manners/default.js"
import * as Storage from "../components/storage/indexed-db.js"

export * from "../common/fission.js"

export { Annexes } from "../components/account/fission.js"
export type DefaultAnnex = Account.Annexes.Standard

export { ProvideParams, ProvideResponse, RequestParams, RequestResponse } from "../components/authority/browser-url.js"

/**
 * Account type.
 */
export type AccountImplementations = "delegated" | "standard"

/**
 * Component configurations for various account implementations.
 */
export const accountImplementations = {
  /**
   * The default Fission stack using solely delegated account access.
   *
   * Programs created with this stack cannot register accounts,
   * they solely depend on granted authority in order to operate.
   * This means receiving UCANs with the necessary account and
   * file system capabilities, and receiving access keys from elsewhere.
   */
  delegated(config: Configuration, environment?: string | Fission.Endpoints) {
    return components(config, { accountImplementation: "delegated", environment })
  },

  /**
   * The default Fission stack using app and/or verified accounts.
   *
   * Verified accounts require an email address. Before registration
   * users will receive an email with a code or link that they'll
   * need before creating their actual account.
   *
   * App accounts don't require an email address, meaning you can
   * set up some external identifier verification, but it's not required.
   * More importantly, the app developer pays for the storage used by app accounts.
   */
  standard(config: Configuration, environment?: string | Fission.Endpoints) {
    return components(config, { accountImplementation: "standard", environment })
  },
}

/**
 * The default Fission stack.
 *
 * @group 🚀
 */
export async function components(
  config: Configuration,
  settings?: {
    accountImplementation: "delegated"
    environment?: string | Fission.Endpoints
  }
): Promise<
  Components<
    Account.Annexes.Delegated,
    Authority.ProvideResponse,
    Authority.RequestResponse
  >
>
export async function components(
  config: Configuration,
  settings?: {
    accountImplementation: "standard"
    environment?: string | Fission.Endpoints
  }
): Promise<
  Components<
    Account.Annexes.Standard,
    Authority.ProvideResponse,
    Authority.RequestResponse
  >
>
export async function components(
  config: Configuration,
  settings?: {
    environment?: string | Fission.Endpoints
  }
): Promise<
  Components<
    DefaultAnnex,
    Authority.ProvideResponse,
    Authority.RequestResponse
  >
>
export async function components(
  config: Configuration,
  settings?: {
    accountType?: AccountImplementations
    environment?: string | Fission.Endpoints
  }
): Promise<
  Components<
    Account.Annexes.Delegated | Account.Annexes.Standard,
    Authority.ProvideResponse,
    Authority.RequestResponse
  >
> {
  const namespace = Config.namespace(config)

  // Determine environment
  let endpoints = Fission.PRODUCTION

  if (typeof settings?.environment === "string") {
    switch (settings.environment.toLowerCase()) {
      case "development":
        endpoints = Fission.DEVELOPMENT
        break
      case "staging":
        endpoints = Fission.STAGING
        break
    }
  } else if (typeof settings?.environment === "object") {
    endpoints = settings.environment
  }

  // Collect components
  const storage = Storage.implementation({ name: namespace })
  const agentStore = Storage.implementation({ name: `${namespace}/agent` })
  const identifierStore = Storage.implementation({ name: `${namespace}/identifier` })

  const clerk = Clerk.implementation()
  const dns = DNS.implementation(endpoints)
  const manners = Manners.implementation(config)
  const channel = Channel.implementation(manners, endpoints)
  const agent = await Agent.implementation({ store: agentStore })
  const identifier = await Identifier.implementation({ store: identifierStore })
  const depot = await Depot.implementation(manners, storage, `${namespace}/blockstore`, endpoints)
  const authority = Authority.implementation()

  const account = (() => {
    switch (settings?.accountType || "standard") {
      case "delegated":
        return Account.delegated({
          agent,
          identifier,
          dns,
          manners,
        }, endpoints)
      case "standard":
        return Account.standard({
          agent,
          identifier,
          dns,
          manners,
        }, endpoints)
      default:
        throw new Error("Invalid account type")
    }
  })()

  // Fin
  return {
    account,
    agent,
    authority,
    channel,
    clerk,
    depot,
    dns,
    identifier,
    manners,
    storage,
  }
}
