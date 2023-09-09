import * as Path from "./path/index.js"

import { AccessKeyWithContext } from "./accessKey.js"
import { CID } from "./common/cid.js"
import * as Clerk from "./components/clerk/implementation.js"
import { Cabinet } from "./repositories/cabinet.js"
import { Category, Ticket } from "./ticket/types.js"

export class Inventory {
  #authorityClerk: Clerk.Implementation
  #cabinet: Cabinet

  /** @internal */
  constructor(
    authorityClerk: Clerk.Implementation,
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
  async bundleTickets(
    ticket: Ticket,
    proofResolver: (ticket: Ticket) => Promise<CID[]>
  ): Promise<Ticket[]> {
    return [
      ticket,
      ...(await proofResolver(ticket)).map(cid => {
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

  lookupTicketsByAudience(audience: string): Ticket[] {
    return (this.#cabinet.ticketsIndexedByAudience[audience]?.map(t => t.ticket) || [])
  }

  lookupTicketsByCategory(category: Category): Ticket[] {
    return this.#cabinet.tickets.filter(c => c.category === category).map(c => c.ticket)
  }

  lookupTicketByCID(cid: string | CID): Ticket | null {
    return this.#cabinet.ticketsIndexedByCID[cid.toString()]?.ticket || null
  }

  lookupFileSystemTicket(
    path: Path.DistinctivePath<Path.Segments>,
    did: string
  ): Promise<Ticket | null> {
    const fsTickets = this.#cabinet.tickets
      .filter(t => t.category === "file_system")
      .map(t => t.ticket)

    return this.#lookupFileSystemTicket(
      fsTickets,
      path => this.#authorityClerk.tickets.fileSystem.matcher(path, did),
      path
    )
  }

  async #lookupFileSystemTicket(
    fsTickets: Ticket[],
    matcher: (pathSoFar: Path.Distinctive<Path.Segments>) => (ticket: Ticket) => Promise<boolean>,
    path: Path.DistinctivePath<Path.Segments>
  ): Promise<Ticket | null> {
    const pathParts = Path.unwrap(path)

    const results = await ["", ...pathParts].reduce(
      async (acc: Promise<Ticket[]>, _part, idx): Promise<Ticket[]> => {
        const pathSoFar = Path.fromKind(Path.kind(path), ...(pathParts.slice(0, idx)))
        const match = matcher(pathSoFar)

        return [
          ...(await acc),
          ...(await fsTickets.reduce(
            async (acc: Promise<Ticket[]>, ticket: Ticket) => {
              const list = await acc
              if (await match(ticket)) return [...list, ticket]
              return list
            },
            Promise.resolve([])
          )),
        ]
      },
      Promise.resolve([])
    )

    // TODO: Need to sort by ability level, ie. prefer super user over anything else
    return results[0] || null
  }

  async rootIssuer(
    ticket: Ticket,
    proofResolver: (ticket: Ticket) => Promise<CID[]>
  ): Promise<string> {
    return this.rootTicket(ticket, proofResolver).then(r => r.issuer)
  }

  async rootTicket(
    ticket: Ticket,
    proofResolver: (ticket: Ticket) => Promise<CID[]>
  ): Promise<Ticket> {
    const proofs = await proofResolver(ticket)

    if (proofs[0]) {
      const t = this.lookupTicketByCID(proofs[0])
      if (!t) throw new Error(`Missing a proof in the local repository: ${proofs[0]}`)
      return this.rootTicket(t, proofResolver)
    }

    return ticket
  }
}
