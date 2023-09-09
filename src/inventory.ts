import * as Path from "./path/index.js"

import { AccessKeyWithContext } from "./accessKey.js"
import { CID } from "./common/cid.js"
import { Clerk } from "./components/authority/implementation.js"
import { Cabinet } from "./repositories/cabinet.js"
import { Ticket } from "./ticket/types.js"

export class Inventory {
  #authorityClerk: Clerk
  #cabinet: Cabinet

  /** @internal */
  constructor(
    authorityClerk: Clerk,
    cabinet: Cabinet
  ) {
    this.#authorityClerk = authorityClerk
    this.#cabinet = cabinet
  }

  /////////////
  // LOOKUPS //
  /////////////

  /**
   * Collect the given ticket and all its proofs.
   */
  bundleTickets(
    ticket: Ticket,
    proofResolver: (ticket: Ticket) => CID[]
  ): Ticket[] {
    return [
      ticket,
      ...proofResolver(ticket).map(cid => {
        const t = this.lookupTicketByCID(cid)
        if (!t) throw new Error(`Missing a proof in the local repository: ${cid}`)
        return t
      }),
    ]
  }

  descendUntilMatchingTicket(
    ticket: Ticket,
    matcher: (ticket: Ticket) => boolean,
    proofResolver: (ticket: Ticket) => CID[]
  ): Ticket | null {
    if (matcher(ticket)) return ticket
    return proofResolver(ticket).reduce(
      (acc: Ticket | null, ticketCID) => {
        if (acc) return acc
        const prf = this.lookupTicketByCID(ticketCID.toString())
        return prf && matcher(prf) ? prf : null
      },
      null
    )
  }

  findAccessKey(
    path: Path.Distinctive<Path.Segments>,
    did: string
  ): AccessKeyWithContext | null {
    const unwrappedPath = Path.unwrap(path)
    const pathKind = Path.kind(path)

    return unwrappedPath.reduce(
      (acc: null | AccessKeyWithContext, _p, idx) => {
        if (acc) return acc
        const partialPath = Path.fromKind(pathKind, ...unwrappedPath.slice(0, idx + 1))
        const key = this.lookupAccessKey(partialPath, did)
        return key ? { did, key: key, path: partialPath } : null
      },
      null
    )
  }

  lookupAccessKey(path: Path.Distinctive<Path.Segments>, did: string): Uint8Array | null {
    const item = this.#cabinet.collection[`${did}/${Path.toPosix(path)}`]
    return item?.type === "access-key" ? item.key : null
  }

  lookupTicketByAudience(audience: string): Ticket[] {
    return (this.#cabinet.ticketsIndexedByAudience[audience]?.map(t => t.ticket) || [])
  }

  lookupTicketByCID(cid: string | CID): Ticket | null {
    return this.#cabinet.ticketsIndexedByCID[cid.toString()]?.ticket || null
  }

  lookupFileSystemTicket(
    path: Path.DistinctivePath<Path.Segments>,
    did: string
  ): Ticket | null {
    const fsTickets = this.#cabinet.tickets
      .filter(t => t.category === "file_system")
      .map(t => t.ticket)

    return this.#lookupFileSystemTicket(
      fsTickets,
      path => this.#authorityClerk.tickets.fileSystem.matcher(path, did),
      path
    )
  }

  #lookupFileSystemTicket(
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
}
