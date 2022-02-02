import * as authLobby from "./lobby.js"
import { InitOptions } from "../init/types.js"
import { State } from "./state.js"


import type { Channel } from "./channel"

export const init = (options: InitOptions): Promise<State | null> => {
  return authLobby.init(options)
}

export const register = (options: { username: string; email: string }): Promise<{ success: boolean }> => {
  return authLobby.register(options)
}

export const isUsernameValid = (username: string): Promise<boolean> => {
  return authLobby.isUsernameValid(username)
}

export const isUsernameAvailable = (username: string): Promise<boolean> => {
  return authLobby.isUsernameAvailable(username)
}


export const createChannel = (username: string, handleMessage: (event: MessageEvent) => any): Promise<Channel> => {
  return authLobby.createChannel(username, handleMessage)
}

export const delegateAccount = (audience: string): Promise<Record<string, unknown>> => {
  return authLobby.delegateAccount(audience)
}

export const linkDevice = (data: Record<string, unknown>): Promise<null> => {
  return authLobby.linkDevice(data)
}
