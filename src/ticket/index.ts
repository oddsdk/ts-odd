import { isObject, isString } from "../common/type-checks.js"
import { Ticket } from "./types.js"

////////
// 🛠️ //
////////

export function isTicket(ticket: unknown): ticket is Ticket {
  return isObject(ticket) && isString(ticket.issuer) && isString(ticket.audience) && isString(ticket.token)
}
