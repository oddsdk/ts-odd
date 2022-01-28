import { InitOptions } from "../../init/types.js"
import { State } from "../state.js"


export type Implementation = {
  init: (options: InitOptions) => Promise<State | null>
  register: (options: { email: string; username: string }) => Promise<{ success: boolean }>
  isUsernameValid: (username: string) => Promise<boolean>
  isUsernameAvailable: (username: string) => Promise<boolean>
}
