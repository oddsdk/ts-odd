import * as Path from "../../path/index.js"
import * as Agent from "../agent/implementation.js"
import * as Identifier from "../identifier/implementation.js"

import { CID } from "../../common/cid.js"
import { Ticket } from "../../ticket/types.js"

/**
 * Responsible for managing tickets or parts thereof.
 */
export type Implementation = {
  tickets: {
    /**
     * Creates a CID for a Ticket.
     */
    cid(ticket: Ticket): Promise<CID>

    /**
     * Delegates a ticket from the current identifier to another identifier.
     */
    delegate(ticket: Ticket, identifier: Identifier.Implementation, audienceIdentifier: string): Promise<Ticket>

    /**
     * Lists the proof CIDs for a Ticket.
     */
    proofResolver(ticket: Ticket): Promise<CID[]>

    fileSystem: {
      /**
       * Given a root path, create the origin file system ticket.
       */
      origin: (path: Path.DistinctivePath<Path.Segments>, audience: string) => Promise<Ticket>
      /**
       * Given a root path, find a matching file system ticket.
       */
      matcher: (path: Path.DistinctivePath<Path.Segments>, did: string) => (ticket: Ticket) => Promise<boolean>
    }
    misc: {
      /**
       * Identifier → Agent
       *
       * Before registration a delegation is always performed
       * from the identifier to the agent.
       *
       * The idea here is that any other delegation should always be
       * done with the identifier as the audience so that identifier
       * is always in control.
       *
       * In this function we should give the agent access to
       * all capabilities the identifier can use.
       */
      identifierToAgentDelegation: (
        identifier: Identifier.Implementation,
        agent: Agent.Implementation,
        proofs: Ticket[]
      ) => Promise<Ticket>
    }
  }
}
