import * as Account from "../account/implementation.js"

import { AccessKeyWithContext } from "../../accessKey.js"
import { Query } from "../../authority/query.js"
import { Ticket } from "../../ticket/types.js"
import { ProvideParams } from "./browser-url/provider.js"
import { RequestParams } from "./browser-url/requestor.js"

///////////////
// REQUESTOR //
///////////////

export type AuthorityArtefacts<RequestResponse> = {
  accessKeys: AccessKeyWithContext[]
  accountTickets: { query: Query; tickets: Ticket[] }[]
  authorisedQueries: Query[]
  fileSystemTickets: { query: Query; tickets: Ticket[] }[]
  resolvedNames: Record<string, string>
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
  provide<AccountAnnex extends Account.AnnexParentType>(params: ProvideParams<AccountAnnex>): Promise<ProvideResponse>
  request(params: RequestParams): Promise<AuthorityArtefacts<RequestResponse> | null>
}
