import * as Uint8Arrays from "uint8arrays"

import * as Storage from "../components/storage/implementation.js"
import * as Path from "../path/index.js"

import { AccessKeyWithContext } from "../accessKey.js"
import { decodeCID, encodeCID } from "../common/cid.js"
import { CID } from "../common/cid.js"
import { isObject, isString } from "../common/type-checks.js"
import Repository, { RepositoryOptions } from "../repository.js"
import { Category, Ticket, TicketWithContext, isCategory } from "../ticket/types.js"

////////
// 🧩 //
////////

export type CabinetItem =
  | { type: "access-key" } & AccessKeyWithContext
  | { type: "ticket" } & TicketWithContext

export type CabinetCollection = Record<string, CabinetItem>

////////
// 🛠️ //
////////

export function create({ storage }: { storage: Storage.Implementation }): Promise<Repo> {
  return Repo.create({
    storage,
    storageName: storage.KEYS.CABINET,
  })
}

///////////
// CLASS //
///////////

export { Repo as Cabinet }

export class Repo extends Repository<CabinetCollection, CabinetItem> {
  public accessKeys: Record<string, { key: Uint8Array; path: Path.Distinctive<Path.Segments> }[]>
  public tickets: TicketWithContext[]
  public ticketsIndexedByAudience: Record<string, TicketWithContext[]>
  public ticketsIndexedByCID: Record<string, TicketWithContext>

  private constructor(options: RepositoryOptions) {
    super(options)
    this.accessKeys = {}
    this.tickets = []
    this.ticketsIndexedByAudience = {}
    this.ticketsIndexedByCID = {}
  }

  // IMPLEMENTATION

  emptyCollection() {
    return {}
  }

  mergeCollections(a: CabinetCollection, b: CabinetCollection): CabinetCollection {
    return {
      ...a,
      ...b,
    }
  }

  async toCollection(item: CabinetItem): Promise<CabinetCollection> {
    switch (item.type) {
      case "access-key":
        return { [`${item.did}/${Path.toPosix(item.path)}`]: item }
      case "ticket":
        return { [item.cid.toString()]: item }
    }
  }

  async collectionUpdateCallback(collection: CabinetCollection) {
    const entries = Object.entries(collection)

    const { accessKeys, tickets } = entries.reduce(
      (acc, [_k, item]) => {
        if (item.type === "access-key") {
          return {
            ...acc,
            accessKeys: {
              ...acc.accessKeys,
              [item.did]: [...(acc.accessKeys[item.did] || []), { key: item.key, path: item.path }],
            },
          }
        } else if (item.type === "ticket") {
          return { ...acc, tickets: [...acc.tickets, item] }
        } else {
          return acc
        }
      },
      {
        accessKeys: {},
        tickets: [],
      } as {
        accessKeys: Record<string, { key: Uint8Array; path: Path.Distinctive<Path.Segments> }[]>
        tickets: TicketWithContext[]
      }
    )

    this.accessKeys = accessKeys
    this.tickets = tickets

    this.ticketsIndexedByAudience = tickets.reduce(
      (acc: Record<string, TicketWithContext[]>, ticket) => {
        return {
          ...acc,
          [ticket.ticket.audience]: [...(acc[ticket.ticket.audience] || []), ticket],
        }
      },
      {}
    )

    this.ticketsIndexedByCID = entries.reduce(
      (acc: Record<string, TicketWithContext>, [k, v]) => {
        if (v.type !== "ticket") return acc
        return {
          ...acc,
          [k]: v,
        }
      },
      {}
    )
  }

  // ENCODING

  fromJSON(a: string): CabinetCollection {
    const encodedObj = JSON.parse(a)

    return Object.entries(encodedObj).reduce(
      (acc, [k, v]) => {
        return {
          ...acc,
          [k]: decodeItem(v),
        }
      },
      {}
    )
  }

  toJSON(a: CabinetCollection): string {
    const encodedObj = Object.entries(a).reduce(
      (acc, [k, v]) => {
        return {
          ...acc,
          [k]: encodeItem(v),
        }
      },
      {}
    )

    return JSON.stringify(encodedObj)
  }

  // EXTRA

  addTicket(category: Category, ticket: Ticket, cidCreator: (ticket: Ticket) => Promise<CID>): Promise<void> {
    return this.addTickets(category, [ticket], cidCreator)
  }

  async addTickets(category: Category, tickets: Ticket[], cidCreator: (ticket: Ticket) => Promise<CID>): Promise<void> {
    const ticketsWithContext: Array<{ type: "ticket" } & TicketWithContext> = await Promise.all(
      tickets.map(async t => ({
        type: "ticket",
        category,
        cid: await cidCreator(t),
        ticket: t,
      }))
    )

    return this.add(
      // Only add tickets we don't have yet
      ticketsWithContext.filter(t => {
        return !this.ticketsIndexedByCID[t.cid.toString()]
      })
    )
  }

  addAccessKey(item: AccessKeyWithContext) {
    return this.addAccessKeys([item])
  }

  addAccessKeys(items: AccessKeyWithContext[]) {
    // Delete old access keys matching the same DID and path,
    // in case we want to make a new file system.
    items.forEach(item => {
      if (this.hasAccessKey(item.did, item.path)) {
        delete this.collection[`${item.did}/${Path.toPosix(item.path)}`]
      }
    })

    // Add new ones
    return this.add(items.map(item => {
      return { type: "access-key", ...item }
    }))
  }

  hasAccessKey(did: string, path: Path.Distinctive<Path.Segments>): boolean {
    return !!this.collection[`${did}/${Path.toPosix(path)}`]
  }
}

//////////////
// ENCODING //
//////////////

export function decodeItem(item: unknown): CabinetItem {
  if (!isObject(item)) throw new Error("Expected the decoded cabinet to be an object")

  switch (item.type) {
    case "access-key":
      if (isString(item.key) && isString(item.path) && isString(item.did)) {
        return {
          type: item.type,
          path: Path.fromPosix(item.path),
          key: Uint8Arrays.fromString(item.key, "base64pad"),
          did: item.did,
        }
      } else {
        throw new Error("Encoded access-key cabinet-item did not have the expected `key` and `path` attributes")
      }

    case "ticket":
      if (
        isString(item.category)
        && isCategory(item.category)
        && isString(item.cid)
        && isObject(item.ticket)
        && isString(item.ticket.issuer)
        && isString(item.ticket.audience)
        && isString(item.ticket.token)
      ) {
        return {
          type: item.type,
          category: item.category,
          cid: decodeCID(item.cid),
          ticket: {
            issuer: item.ticket.issuer,
            audience: item.ticket.audience,
            token: item.ticket.token,
          },
        }
      } else {
        throw new Error("Encoded ticket cabinet-item did not have the expected attributes")
      }

    default:
      throw new Error(`Cabinet does not handle the item type '${item.type}'`)
  }
}

export function encodeItem(item: CabinetItem): any {
  switch (item.type) {
    case "access-key":
      return {
        type: "access-key",
        key: Uint8Arrays.toString(item.key, "base64pad"),
        path: Path.toPosix(item.path),
        did: item.did,
      }
    case "ticket":
      return { ...item, cid: encodeCID(item.cid) }
  }
}
