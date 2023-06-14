import { Channel, ChannelOptions } from "../../channel.js"


export type Implementation = {
  /**
   * How to establish an AWAKE channel.
   *
   * This used for device linking and transferring UCANs.
   */
  establish: (options: ChannelOptions) => Promise<Channel>
}