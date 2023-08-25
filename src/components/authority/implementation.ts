import * as Events from "../../events/authority.js"
import * as Path from "../../path/index.js"

import * as Agent from "../agent/implementation.js"
import * as Identifier from "../identifier/implementation.js"

import { Query } from "../../authority/query.js"
import { EventEmitter } from "../../events/emitter.js"
import { Ticket } from "../../ticket/types.js"

export type RequestOptions = {
  extraParams?: Record<string, string>
  query?: Query
  returnUrl?: string
}

export type Provider = {
  type: "provider"

  provide(tickets: Ticket[], eventEmitter: EventEmitter<Events.AuthorityProvider>): Promise<void>
}

export type Requestor = {
  type: "requestor"

  request: (options: RequestOptions, eventEmitter: EventEmitter<Events.AuthorityRequestor>) => Promise<void>
}

/**
 * Responsible for managing tickets or parts thereof.
 */
export type Clerk = {
  tickets: {
    fileSystem: {
      /**
       * Given a root path, create file system ticket.
       */
      create: (path: Path.DistinctivePath<Path.Segments>, audience: string) => Promise<Ticket>
      /**
       * Given a root path, find a matching file system ticket.
       */
      matcher: (path: Path.DistinctivePath<Path.Segments>, did: string) => (ticket: Ticket) => boolean
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
        agent: Agent.Implementation
      ) => Promise<Ticket>
    }
  }
}

/**
 * Implementation.
 */
export type Implementation = {
  clerk: Clerk
}
