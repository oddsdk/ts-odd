import { Cabinet } from "./repositories/cabinet.js"

import { Account, Agent, Authority, Identifier } from "./components.js"
import { AnnexParentType } from "./components/account/implementation.js"

//////////////
// REGISTER //
//////////////

export const register = <Annex extends AnnexParentType>(
  { account, agent, authority, identifier, cabinet }: {
    account: Account.Implementation<Annex>
    agent: Agent.Implementation
    authority: Authority.Implementation
    identifier: Identifier.Implementation
    cabinet: Cabinet
  }
) =>
async (formValues: Record<string, string>): Promise<
  { registered: true } | { registered: false; reason: string }
> => {
  // Do delegation from identifier to agent
  const agentDelegation = await authority.clerk.tickets.misc.identifierToAgentDelegation(identifier, agent)
  await cabinet.addTicket("misc", agentDelegation)

  // Call account register implementation
  const result = await account.register(formValues, agentDelegation)

  if (result.registered) {
    await cabinet.addTickets("account", result.tickets)
    return { registered: true }
  } else {
    return result
  }
}
