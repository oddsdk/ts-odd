import type { Channel, ChannelOptions } from "./channel.js"

import { Configuration } from "../../configuration.js"
import { Maybe } from "../../common/types.js"
import { Session } from "../../session.js"


export type Implementation<C> = {
  type: string,

  activate: (components: C, authenticatedUsername: Maybe<string>, config: Configuration) => Promise<Maybe<Session>>
  canDelegateAccount: (username: string) => Promise<boolean>
  createChannel: (options: ChannelOptions) => Promise<Channel>
  delegateAccount: (username: string, audience: string) => Promise<Record<string, unknown>>
  isUsernameAvailable: (username: string) => Promise<boolean>
  isUsernameValid: (username: string) => Promise<boolean>
  linkDevice: (username: string, data: Record<string, unknown>) => Promise<void>
  register: (options: { username: string; email?: string }) => Promise<{ success: boolean }>
}
