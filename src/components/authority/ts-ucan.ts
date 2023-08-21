import * as AgentDID from "../../agent/did.js"
import * as Path from "../../path/index.js"
import * as Ucan from "../../ucan/ts-ucan/index.js"
import * as Agent from "../agent/implementation.js"
import * as Identifier from "../identifier/implementation.js"

import { Ticket } from "../../ticket/types.js"
import { Implementation } from "./implementation.js"

///////////
// CLERK //
///////////

export async function createFileSystemTicket(
  identifier: Identifier.Implementation,
  path: Path.DistinctivePath<Path.Segments>,
  audience: string
): Promise<Ticket> {
  const identifierDID = await identifier.did()
  const ucan = await Ucan.build({
    // from & to
    issuer: {
      did: () => identifierDID,
      jwtAlg: await identifier.ucanAlgorithm(),
      sign: identifier.sign,
    },
    audience,

    // capabilities
    capabilities: [
      {
        with: { scheme: "wnfs", hierPart: `//${identifierDID}${Path.toPosix(path, { absolute: true })}` },
        can: { namespace: "fs", segments: ["*"] },
      },
    ],
  })

  return Ucan.toTicket(ucan)
}

export async function identifierToAgentDelegation(
  identifier: Identifier.Implementation,
  agent: Agent.Implementation
): Promise<Ticket> {
  const identifierDID = await identifier.did()
  const ucan = await Ucan.build({
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

  return Ucan.toTicket(ucan)
}

export function matchFileSystemTicket(
  path: Path.DistinctivePath<Path.Segments>,
  did: string
): (ticket: Ticket) => boolean {
  return (ticket: Ticket): boolean => {
    const hierPart = `//${did}/${Path.toPosix(path)}`
    const ucan = Ucan.decode(ticket.token)

    return !!ucan.payload.att.find(cap => {
      return cap.with.hierPart === hierPart && (cap.can === "*" || cap.can.namespace === "fs")
    })
  }
}

////////
// 🛳️ //
////////

export function implementation(
  identifier: Identifier.Implementation
): Implementation {
  return {
    clerk: {
      tickets: {
        fileSystem: {
          create: (...args) => createFileSystemTicket(identifier, ...args),
          matcher: matchFileSystemTicket,
        },
        misc: {
          identifierToAgentDelegation,
        },
      },
    },
  }
}
