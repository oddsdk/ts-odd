import { Capabilities } from "../../capabilities.js"
import { Maybe } from "../../common/types.js"
import { Permissions } from "../../permissions.js"


export type RequestOptions = {
  extraParams?: Record<string, string>
  permissions?: Permissions
  returnUrl?: string
}

export type Implementation = {
  collect: () => Promise<Maybe<Capabilities>>
  request: (options: RequestOptions) => Promise<void>
}