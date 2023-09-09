import * as Provider from "./browser-url/provider.js"
import * as Requestor from "./browser-url/requestor.js"

import { ProvideResponse, RequestResponse } from "./browser-url/common.js"
import { Implementation } from "./implementation.js"

////////
// 🛳️ //
////////

export { ProvideResponse, RequestResponse } from "./browser-url/common.js"
export { ProvideParams } from "./browser-url/provider.js"
export { RequestParams } from "./browser-url/requestor.js"

export function implementation(): Implementation<ProvideResponse, RequestResponse> {
  return {
    provide: Provider.provide,
    request: Requestor.request,
  }
}
