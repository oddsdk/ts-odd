import { Channel, ChannelOptions } from "../../channel.js"
import { createWebsocketChannel } from "../../channel/websocket.js"
import { Endpoints } from "../../common/fission.js"
import * as Fission from "../../common/fission.js"
import { Manners } from "../../components.js"
import { Implementation } from "./implementation.js"

////////
// 🛠️ //
////////

export function establish<FS>(
  manners: Manners.Implementation<FS>,
  endpoints: Endpoints,
  options: ChannelOptions
): Promise<Channel> {
  const host = `${endpoints.server}${endpoints.apiPath}`
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://")

  return createWebsocketChannel(
    manners,
    `${host}/relay/${options.topic}`,
    options
  )
}

////////
// 🛳️ //
////////

export function implementation<FS>(
  manners: Manners.Implementation<FS>,
  optionalEndpoints?: Endpoints
): Implementation {
  const endpoints = optionalEndpoints || Fission.PRODUCTION

  return {
    establish: (...args) => establish(manners, endpoints, ...args),
  }
}
