import * as authLobby from "./lobby.js"
import { InitOptions } from "../init/types.js"
import { State } from "./state.js"


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
