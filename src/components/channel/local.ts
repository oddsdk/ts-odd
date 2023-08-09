import { Channel, ChannelOptions } from "../../channel.js"
import { Implementation } from "./implementation.js"

////////
// 🧩 //
////////

export type Context = {}

////////
// 🛠️ //
////////

export function establish(
  options: ChannelOptions<Context>
): Promise<Channel> {
  throw new Error("No local channel available just yet.") // NOTE: Do WebRTC implementation?
}

////////
// 🛳️ //
////////

export function implementation(): Implementation<Context> {
  return {
    establish,
  }
}
