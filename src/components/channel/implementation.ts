import { Channel, ChannelOptions } from "../../channel.js"

export type Implementation = {
  /**
   * Creates a `Channel` which can be used to transfer data over.
   */
  establish: (options: ChannelOptions) => Promise<Channel>
}
