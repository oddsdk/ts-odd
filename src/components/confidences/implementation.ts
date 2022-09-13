import * as Crypto from "../../components/crypto/implementation.js"
import * as Depot from "../../components/depot/implementation.js"
import { Confidences } from "../../confidences.js"
import { Maybe } from "../../common/types.js"
import { Permissions } from "../../permissions.js"


export type Dependents = {
  crypto: Crypto.Implementation
  depot: Depot.Implementation
}

export type RequestOptions = {
  extraParams?: Record<string, string>
  permissions?: Permissions
  returnUrl?: string
}

export type Implementation = {
  collect: () => Promise<Maybe<Confidences>>,
  request: (options: RequestOptions) => Promise<void>
}