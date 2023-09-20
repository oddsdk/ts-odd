import { Cabinet } from "./repositories/cabinet.js"

import { Account, Agent, Clerk, Identifier } from "./components.js"
import { AnnexParentType } from "./components/account/implementation.js"
import { Names } from "./repositories/names.js"

//////////////
// REGISTER //
//////////////

export const register = <Annex extends AnnexParentType>(
  { account, agent, clerk, identifier, cabinet, names }: {
    account: Account.Implementation<Annex>
    agent: Agent.Implementation
    clerk: Clerk.Implementation
    identifier: Identifier.Implementation
    cabinet: Cabinet
    names: Names
  }
) =>
async (formValues: Record<string, string>): Promise<
  { registered: true } | { registered: false; reason: string }
> => {
  // Call account register implementation
  const result = await account.register(identifier, names, formValues)

  if (result.registered) {
    // Do delegation from identifier to agent
    const agentDelegation = await clerk.tickets.misc.identifierToAgentDelegation(
      identifier,
      agent,
      result.tickets
    )

    await cabinet.addTicket("agent", agentDelegation, clerk.tickets.cid)
    await cabinet.addTickets("account", result.tickets, clerk.tickets.cid)
    return { registered: true }
  } else {
    return result
  }
}
