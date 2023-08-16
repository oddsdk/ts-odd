import * as Events from "../../events/authority.js"

import { Query } from "../../authority/query.js"
import { EventEmitter } from "../../events/emitter.js"
import { Ucan } from "../../ucan/index.js"

export type RequestOptions = {
  extraParams?: Record<string, string>
  query?: Query
  returnUrl?: string
}

export type Provider = {
  type: "provider"

  provide(ucans: Ucan[], eventEmitter: EventEmitter<Events.AuthorityProvider>): Promise<void>
}

export type Requestor = {
  type: "requestor"

  request: (options: RequestOptions, eventEmitter: EventEmitter<Events.AuthorityRequestor>) => Promise<void>
}
