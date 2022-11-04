import type { Channel, ChannelOptions } from "./channel.js"

import * as Confidences from "../confidences/implementation.js"
import * as Crypto from "../crypto/implementation.js"
import * as Depot from "../depot/implementation.js"
import * as Manners from "../manners/implementation.js"
import * as Reference from "../reference/implementation.js"
import * as Storage from "../storage/implementation.js"

import { Configuration } from "../../configuration.js"
import { Maybe } from "../../common/types.js"
import { Session } from "../../session.js"


export type Dependents = {
  crypto: Crypto.Implementation,
  reference: Reference.Implementation
  storage: Storage.Implementation
}


export type Implementation = {
  type: string,

  activate: (components: Components, authenticatedUsername: Maybe<string>, config: Configuration) => Promise<Maybe<Session>>
  canDelegateAccount: (username: string) => Promise<boolean>
  createChannel: (options: ChannelOptions) => Promise<Channel>
  delegateAccount: (username: string, audience: string) => Promise<Record<string, unknown>>
  isUsernameAvailable: (username: string) => Promise<boolean>
  isUsernameValid: (username: string) => Promise<boolean>
  linkDevice: (username: string, data: Record<string, unknown>) => Promise<void>
  register: (options: { username: string; email?: string }) => Promise<{ success: boolean }>
}



// ㊙️


type Components = {
  auth: Implementation[]
  confidences: Confidences.Implementation
  crypto: Crypto.Implementation
  depot: Depot.Implementation
  manners: Manners.Implementation
  reference: Reference.Implementation
  storage: Storage.Implementation
}
