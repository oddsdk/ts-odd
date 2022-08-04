import { InitOptions } from "../../init/types.js"
import { State } from "../state.js"

import type { Channel, ChannelOptions } from "../../auth/channel.js"

export type Implementation = {
  init: (options: InitOptions) => Promise<State | null>
  register: (options: { username: string; email?: string }) => Promise<{ success: boolean }>
  isUsernameValid: (username: string) => Promise<boolean>
  isUsernameAvailable: (username: string) => Promise<boolean>
  transformUsername: (username: string) => { username: string; hash: boolean }
  createChannel: (options: ChannelOptions) => Promise<Channel>
  checkCapability: (username: string) => Promise<boolean>
  delegateAccount: (username: string, audience: string) => Promise<Record<string, unknown>>
  linkDevice: (data: Record<string, unknown>) => Promise<void>
}
