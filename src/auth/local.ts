import { State } from "../index.js"
import { createAccount } from "../lobby/index.js"
import * as user from "../lobby/username.js"
import * as storage from "../storage/index.js"
import { USERNAME_STORAGE_KEY } from "../common/index.js"

export const init = async (): Promise<State | null> => {
  console.log("initialize local auth")
  return new Promise((resolve) => resolve(null))
}

export const register = async (options: { username: string; email: string}): Promise<{success: boolean}> => {
  const { success } = await createAccount(options)

  if (success) {
    await storage.setItem(USERNAME_STORAGE_KEY, options.username)
    return { success: true }
  }
  return { success: false }
}

export const isUsernameValid = async (username: string): Promise<boolean> => {
  return user.isUsernameValid(username)
}

export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  return user.isUsernameAvailable(username)
}

export const LOCAL_IMPLEMENTATION = {
  auth: {
    init,
    register,
    isUsernameValid,
    isUsernameAvailable
  }
}