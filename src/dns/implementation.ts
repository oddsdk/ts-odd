import { DNS_IMPLEMENTATION } from "./implementation/dns.js"
import { Implementation } from "./implementation/types.js"


export let impl: Implementation = DNS_IMPLEMENTATION.dns


export function set(i: Partial<Implementation>): void { impl = { ...impl, ...i } }
