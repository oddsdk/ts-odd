import * as Path from "../../path/index.js"
import * as Account from "../account/implementation.js"
import * as Agent from "../agent/implementation.js"
import * as Identifier from "../identifier/implementation.js"

import { AccessKeyWithContext } from "../../accessKey.js"
import { Query } from "../../authority/query.js"
import { Ticket } from "../../ticket/types.js"
import { ProvideParams } from "./browser-url/provider.js"
import { RequestParams } from "./browser-url/requestor.js"

///////////
// CLERK //
///////////

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

///////////////
// REQUESTOR //
///////////////

export type AuthorityArtefacts<RequestResponse> = {
  accessKeys: AccessKeyWithContext[]
  accountTickets: Ticket[]
  authorisedQueries: Query[]
  fileSystemTickets: Ticket[]
  requestResponse: RequestResponse
}

export type RequestOptions = {
  extraParams?: Record<string, string>
  returnUrl?: string
}

////////////////////
// IMPLEMENTATION //
////////////////////

export type Implementation<ProvideResponse, RequestResponse> = {
  clerk: Clerk
  provide<AccountAnnex extends Account.AnnexParentType>(params: ProvideParams<AccountAnnex>): Promise<ProvideResponse>
  request(params: RequestParams): Promise<AuthorityArtefacts<RequestResponse> | null>
}
