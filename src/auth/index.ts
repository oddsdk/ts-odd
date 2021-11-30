import { impl } from "../setup/dependencies.js"
import { InitOptions, State } from "../index.js"

export const init = (options: InitOptions): Promise<State | null> => {
  return impl.auth.init(options)
}

export const register = (options: { username: string; email: string }): Promise<{success: boolean}> => {
  return impl.auth.register(options)
}

export const isUsernameValid = (username: string): Promise<boolean> => {
  return impl.auth.isUsernameValid(username)
}

export const isUsernameAvailable = (username: string): Promise<boolean> => {
  return impl.auth.isUsernameAvailable(username)
}