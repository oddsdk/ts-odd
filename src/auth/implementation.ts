import { IMPLEMENTATION } from "./lobby.js"
import { Implementation } from "./implementation/types.js"


export let impl: Implementation = IMPLEMENTATION


export function set(i: Implementation): void { impl = i }
