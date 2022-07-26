import { LOBBY_IMPLEMENTATION } from "./implementation/lobby.js"
import { Implementation } from "./implementation/types.js"


export let impl: Implementation = LOBBY_IMPLEMENTATION.auth


export function set(i: Partial<Implementation>): void { impl = { ...impl, ...i } }
