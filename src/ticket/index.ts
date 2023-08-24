import * as Raw from "multiformats/codecs/raw"
import { sha256 } from "multiformats/hashes/sha2"
import * as Uint8Arrays from "uint8arrays"

import { CID } from "../common/cid.js"
import { isObject, isString } from "../common/type-checks.js"
import { Ticket } from "./types.js"

////////
// 🛠️ //
////////

export async function cid(ticket: Ticket): Promise<CID> {
  const multihash = await sha256.digest(
    Uint8Arrays.fromString(ticket.token, "utf8")
  )

  return CID.createV1(Raw.code, multihash)
}

export function collectUnique(tickets: Ticket[]): Ticket[] {
  return tickets.reduce((acc, ticket) => {
    if (acc.tokens.includes(ticket.token)) {
      return acc
    }

    return {
      tickets: [...acc.tickets, ticket],
      tokens: [...acc.tokens, ticket.token],
    }
  }, {
    tickets: [] as Ticket[],
    tokens: [] as string[],
  }).tickets
}

export function isTicket(ticket: unknown): ticket is Ticket {
  return isObject(ticket) && isString(ticket.issuer) && isString(ticket.audience) && isString(ticket.token)
}
