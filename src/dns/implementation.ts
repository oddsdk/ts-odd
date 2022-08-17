import { HTTP_IMPLEMENTATION } from "./implementation/http.js"
import { Implementation } from "./implementation/types.js"


export let impl: Implementation = HTTP_IMPLEMENTATION.dns


export function set(i: Partial<Implementation>): void { impl = { ...impl, ...i } }
