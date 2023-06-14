import * as AgentDID from "./agent/did.js"
import * as Ucan from "./ucan/index.js"
import { Repo as UcanRepo } from "./repositories/ucans.js"

import { Account, Agent, Identifier } from "./components.js"


// LOGIN


export const login = (
  { agent, identifier }: {
    agent: Agent.Implementation
    identifier: Identifier.Implementation
  }
) => async () => {
  // Do delegation from identifier to agent
  const agentDelegation = await identifierToAgentDelegation({ agent, identifier })

  // TODO: Need to do device linking in the case of using web crypto as the identifier.
  //       We also need to transfer UCANs with capabilities.
}


export const register = (
  { account, agent, identifier, ucanRepository }: {
    account: Account.Implementation
    agent: Agent.Implementation
    identifier: Identifier.Implementation
    ucanRepository: UcanRepo
  }
) => async (formValues: Record<string, string>): Promise<
  { ok: true } | { ok: false, reason: string }
> => {
    // Do delegation from identifier to agent
    const agentDelegation = await identifierToAgentDelegation({ agent, identifier })

    // Call account register implementation
    const result = await account.register(formValues, agentDelegation)

    if (result.ok) {
      await ucanRepository.add(result.ucans)
      return { ok: true }

    } else {
      return result

    }
  }



// ㊙️


async function identifierToAgentDelegation({ agent, identifier }: {
  agent: Agent.Implementation,
  identifier: Identifier.Implementation
}) {
  const identifierDID = await identifier.did()

  return Ucan.build({
    dependencies: { agent },

    // from & to
    issuer: {
      did: () => identifierDID,
      jwtAlg: await identifier.ucanAlgorithm(),
      sign: identifier.sign,
    },
    audience: await AgentDID.signing(agent),

    // capabilities
    capabilities: [
      // Powerbox concept:
      // Every capability given to the identifier may be used by the agent.
      {
        with: { scheme: "ucan", hierPart: `${identifierDID}/*` },
        can: { namespace: "ucan", segments: [ "*" ] }
      },
    ]
  })
}