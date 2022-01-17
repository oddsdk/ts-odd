import * as authLobby from "./lobby.js"
import { InitOptions } from "../init/types.js"
import { State } from "./state.js"


import type { Msg } from "keystore-idb/lib/types.js"


export const init = (options: InitOptions): Promise<State | null> => {
  return authLobby.init(options)
}

export const register = (options: { username: string; email: string }): Promise<{success: boolean}> => {
  return authLobby.register(options)
}

export const isUsernameValid = (username: string): Promise<boolean> => {
  return authLobby.isUsernameValid(username)
}

export const isUsernameAvailable = (username: string): Promise<boolean> => {
  return authLobby.isUsernameAvailable(username)
}

export const openChannel = (username: string): Promise<void> => {
  return authLobby.openChannel(username)
}

export const closeChannel = (): Promise<void> => {
  return authLobby.closeChannel()
}

export const publishOnChannel = (data: any): Promise<void> => {
  return authLobby.publishOnChannel(data)
}

export const delegateAccount = (audience: string): Promise<Msg> => {
  return authLobby.delegateAccount(audience)
}

export const linkDevice = (data: any): Promise<null> => {
  return authLobby.linkDevice(data)
}
