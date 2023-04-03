import type { Channel, ChannelOptions } from "./channel.js"

import * as Events from "../../events.js"
import { Configuration } from "../../configuration.js"
import { Maybe } from "../../common/types.js"
import { Session } from "../../session.js"


export type Implementation<C> = {
  type: string

  // `Session` producer
  session: (
    components: C,
    authenticatedUsername: Maybe<string>,
    config: Configuration,
    eventEmitters: { fileSystem: Events.Emitter<Events.FileSystem>; session: Events.Emitter<Events.Session<Session>> }
  ) => Promise<Maybe<Session>>

  // Account creation
  isUsernameAvailable: (username: string) => Promise<boolean>
  isUsernameValid: (username: string) => Promise<boolean>
  register: (options: { username: string; email?: string }) => Promise<{ success: boolean }>

  // Account delegation
  canDelegateAccount: (username: string) => Promise<boolean>
  delegateAccount: (username: string, audience: string) => Promise<Record<string, unknown>>
  linkDevice: (username: string, data: Record<string, unknown>) => Promise<void>

  // Primitives
  createChannel: (options: ChannelOptions) => Promise<Channel>
}
