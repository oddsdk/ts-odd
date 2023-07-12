import * as AgentDID from "./agent/did.js"
import { Cabinet } from "./repositories/cabinet.js"
import * as Ucan from "./ucan/index.js"

import { Account, Agent, Identifier } from "./components.js"

///////////
// LOGIN //
///////////

export const login = (
  { agent, identifier, cabinet }: {
    agent: Agent.Implementation
    identifier: Identifier.Implementation
    cabinet: Cabinet
  },
) =>
async (formValues: Record<string, string>): Promise<
  { ok: true } | { ok: false; reason: string }
> => {
  // TODO:
  return { ok: false, reason: "Not implemented just yet" }
}

//////////////
// REGISTER //
//////////////

export const register = (
  { account, agent, identifier, cabinet }: {
    account: Account.Implementation
    agent: Agent.Implementation
    identifier: Identifier.Implementation
    cabinet: Cabinet
  },
) =>
async (formValues: Record<string, string>): Promise<
  { ok: true } | { ok: false; reason: string }
> => {
  // Do delegation from identifier to agent
  const agentDelegation = await identifierToAgentDelegation({ agent, identifier })
  await cabinet.addUcan(agentDelegation)

  // Call account register implementation
  const result = await account.register(formValues, agentDelegation)

  if (result.ok) {
    await cabinet.addUcans(result.ucans)
    return { ok: true }
  } else {
    return result
  }
}

////////
// ㊙️ //
////////

async function identifierToAgentDelegation({ agent, identifier }: {
  agent: Agent.Implementation
  identifier: Identifier.Implementation
}) {
  const identifierDID = await identifier.did()

  return Ucan.build({
    issuer: {
      did: () => identifierDID,
      jwtAlg: await identifier.ucanAlgorithm(),
      sign: identifier.sign,
    },
    audience: await AgentDID.signing(agent),
    capabilities: [
      // Powerbox concept:
      // Every capability given to the identifier may be used by the agent.
      {
        with: { scheme: "ucan", hierPart: `${identifierDID}/*` },
        can: { namespace: "ucan", segments: ["*"] },
      },
    ],
  })
}
