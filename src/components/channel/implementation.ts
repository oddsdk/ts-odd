import { Channel, ChannelOptions } from "../../channel.js"

export type Implementation<Context> = {
  /**
   * Creates a `Channel` which can be used to transfer data over.
   */
  establish: (options: ChannelOptions<Context>) => Promise<Channel>
}
