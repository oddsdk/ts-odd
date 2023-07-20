import { Channel, ChannelOptions } from "../../channel.js"
import { createWssChannel } from "../../channel/wss.js"
import { Endpoints } from "../../common/fission.js"
import * as Fission from "../../common/fission.js"
import { Implementation } from "./implementation.js"

////////
// 🛠️ //
////////

export function establish(
  endpoints: Endpoints,
  options: ChannelOptions
): Promise<Channel> {
  const host = `${endpoints.server}${endpoints.apiPath}`.replace(/^https?:\/\//, "wss://")
  const accountDID = "TODO"

  return createWssChannel(
    `${host}/user/link/${accountDID}`,
    options
  )
}

////////
// 🛳️ //
////////

export function implementation(
  optionalEndpoints?: Endpoints
): Implementation {
  const endpoints = optionalEndpoints || Fission.PRODUCTION

  return {
    establish: (...args) => establish(endpoints, ...args),
  }
}
