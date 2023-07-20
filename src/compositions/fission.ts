import { Components } from "../components.js"
import { Configuration } from "../configuration.js"
import * as Config from "../configuration.js"

import * as Account from "../components/account/fission.js"
import * as Agent from "../components/agent/web-crypto-api.js"
import * as Channel from "../components/channel/fission.js"
import * as Depot from "../components/depot/fission.js"
import * as DNS from "../components/dns/dns-over-https.js"
import * as Identifier from "../components/identifier/web-crypto-api.js"
import * as Manners from "../components/manners/default.js"
import * as Storage from "../components/storage/indexed-db.js"

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

  const storage = Storage.implementation({ name: namespace })
  const agentStore = Storage.implementation({ name: `${namespace}/agent` })
  const identifierStore = Storage.implementation({ name: `${namespace}/identifier` })
  const depot = await Depot.implementation(storage, `${namespace}/blockstore`)

  const agent = await Agent.implementation({ store: agentStore })
  const channel = Channel.implementation()
  const dns = DNS.implementation()
  const identifier = await Identifier.implementation({ store: identifierStore })
  const manners = Manners.implementation(config)

  const account = Account.implementation({
    agent,
    dns,
    manners,
  })

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
