import { Components } from "../components.js"
import { Configuration } from "../configuration.js"
import * as Config from "../configuration.js"

import * as Account from "../components/account/local.js"
import * as Agent from "../components/agent/web-crypto-api.js"
import * as Channel from "../components/channel/local.js"
import * as Depot from "../components/depot/local.js"
import * as DNS from "../components/dns/dns-over-https/cloudflare-google.js"
import * as Identifier from "../components/identifier/web-crypto-api.js"
import * as Manners from "../components/manners/default.js"
import * as Storage from "../components/storage/indexed-db.js"

export { Annex } from "../components/account/local.js"

/**
 * The default Fission stack using web crypto auth and IPFS.
 */
export async function components(
  settings: Configuration & {
    environment?: string
  }
): Promise<Components<Account.Annex>> {
  const config = Config.extract(settings)
  const namespace = Config.namespace(config)

  // Collect components
  const storage = Storage.implementation({ name: namespace })
  const agentStore = Storage.implementation({ name: `${namespace}/agent` })
  const identifierStore = Storage.implementation({ name: `${namespace}/identifier` })
  const depot = await Depot.implementation({ blockstoreName: `${namespace}/blockstore` })

  const agent = await Agent.implementation({ store: agentStore })
  const channel = Channel.implementation()
  const dns = DNS.implementation()
  const identifier = await Identifier.implementation({ store: identifierStore })
  const manners = Manners.implementation(config)
  const account = Account.implementation()

  // Fin
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