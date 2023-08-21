import * as Path from "../path/index.js"

import { CID } from "../common/cid.js"
import { Authority } from "../components.js"
import { Cabinet } from "../repositories/cabinet.js"
import { Ticket } from "./types.js"

export class Inventory {
  #authority: Authority.Implementation
  #cabinet: Cabinet

  /** @internal */
  constructor(
    authority: Authority.Implementation,
    cabinet: Cabinet
  ) {
    this.#authority = authority
    this.#cabinet = cabinet
  }

  /////////////
  // LOOKUPS //
  /////////////

  descendUntilMatching(
    ticket: Ticket,
    matcher: (ticket: Ticket) => boolean,
    descend: (ticket: Ticket) => CID[]
  ): Ticket | null {
    if (matcher(ticket)) return ticket
    return descend(ticket).reduce(
      (acc: Ticket | null, ticketCID) => {
        if (acc) return acc
        const prf = this.lookupByCID(ticketCID.toString())
        return prf && matcher(prf) ? prf : null
      },
      null
    )
  }

  // findMatching(
  //   matcher: (ticket: Ticket) => boolean,
  //   descend: (ticket: Ticket) => CID[]
  // ): Ticket | null {
  //   return this.#cabinet.tickets.reduce(
  //     (acc: Ticket | null, t) => {
  //       if (acc) return acc
  //       if (matcher(t.ticket)) return t.ticket
  //       return this.descendUntilMatching(t.ticket, matcher, descend)
  //     },
  //     null
  //   )
  // }

  lookupByAudience(audience: string): Ticket[] {
    return (this.#cabinet.ticketsIndexedByAudience[audience]?.map(t => t.ticket) || [])
  }

  lookupByCID(cid: string): Ticket | null {
    return this.#cabinet.ticketsIndexedByCID[cid]?.ticket || null
  }

  lookupFileSystemTicket(
    path: Path.DistinctivePath<Path.Segments>,
    did: string
  ): Ticket | null {
    const fsTickets = this.#cabinet.tickets
      .filter(t => t.category === "file_system")
      .map(t => t.ticket)

    return this.#lookupFileSystemUcan(
      fsTickets,
      path => this.#authority.clerk.tickets.fileSystem.matcher(path, did),
      path
    )
  }

  #lookupFileSystemUcan(
    fsTickets: Ticket[],
    matcher: (pathSoFar: Path.Distinctive<Path.Segments>) => (ticket: Ticket) => boolean,
    path: Path.DistinctivePath<Path.Segments>
  ): Ticket | null {
    const pathParts = Path.unwrap(path)

    const results = ["", ...pathParts].reduce(
      (acc: Ticket[], _part, idx): Ticket[] => {
        const pathSoFar = Path.fromKind(Path.kind(path), ...(pathParts.slice(0, idx)))

        return [
          ...acc,
          ...fsTickets.filter(
            matcher(pathSoFar)
          ),
        ]
      },
      []
    )

    // TODO: Need to sort by ability level, ie. prefer super user over anything else
    return results[0] || null
  }

  rootIssuer(
    ticket: Ticket,
    proofsResolver: (ticket: Ticket) => CID[]
  ): string {
    const proofs = proofsResolver(ticket)

    if (proofs.length) {
      // Always prefer the first proof.
      // TBH, not sure what's best here.
      const prf = proofs[0]
      const t = this.#cabinet.ticketsIndexedByCID[prf.toString()]
      if (!t) throw new Error("Missing a ticket in the inventory")

      return this.rootIssuer(
        t.ticket,
        proofsResolver
      )
    } else {
      return ticket.issuer
    }
  }
}
