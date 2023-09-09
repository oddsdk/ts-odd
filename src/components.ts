import * as Account from "./components/account/implementation.js"
import * as Agent from "./components/agent/implementation.js"
import * as Authority from "./components/authority/implementation.js"
import * as Channel from "./components/channel/implementation.js"
import * as Clerk from "./components/clerk/implementation.js"
import * as Depot from "./components/depot/implementation.js"
import * as DNS from "./components/dns/implementation.js"
import * as Identifier from "./components/identifier/implementation.js"
import * as Manners from "./components/manners/implementation.js"
import * as Storage from "./components/storage/implementation.js"

import { FileSystem } from "./fs/class.js"

////////////////
// COMPONENTS //
////////////////

export type Components<
  Annex extends Account.AnnexParentType,
  AuthorityProvideResponse,
  AuthorityRequestResponse,
> = {
  account: Account.Implementation<Annex>
  agent: Agent.Implementation
  authority: Authority.Implementation<AuthorityProvideResponse, AuthorityRequestResponse>
  channel: Channel.Implementation
  clerk: Clerk.Implementation
  depot: Depot.Implementation
  dns: DNS.Implementation
  identifier: Identifier.Implementation
  manners: Manners.Implementation<FileSystem>
  storage: Storage.Implementation
}
/////////////////////////
// CONVENIENCE EXPORTS //
/////////////////////////

export { Account, Agent, Authority, Channel, Clerk, Depot, DNS, Identifier, Manners, Storage }
