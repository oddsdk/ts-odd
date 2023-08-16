import * as Uint8Arrays from "uint8arrays"

import * as Storage from "../components/storage/implementation.js"
import * as Path from "../path/index.js"
import * as Ucan from "../ucan/index.js"

import { isObject, isString } from "../common/type-checks.js"
import Repository, { RepositoryOptions } from "../repository.js"

////////
// 🧩 //
////////

export type CabinetItem =
  | { type: "ucan"; ucan: Ucan.Ucan }
  | { type: "access-key"; did: string; key: Uint8Array; path: Path.Distinctive<Path.Segments> }

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
  public ucans: Ucan.Ucan[]
  public ucansIndexedByAudience: Record<string, Ucan.Ucan[]>
  public ucansIndexedByCID: Record<string, Ucan.Ucan>

  private constructor(options: RepositoryOptions) {
    super(options)
    this.accessKeys = {}
    this.ucans = []
    this.ucansIndexedByAudience = {}
    this.ucansIndexedByCID = {}
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
      case "ucan":
        return { [(await Ucan.cid(item.ucan)).toString()]: item }
    }
  }

  async collectionUpdateCallback(collection: CabinetCollection) {
    const entries = Object.entries(collection)

    const { accessKeys, ucans } = entries.reduce(
      (acc, [_k, item]) => {
        if (item.type === "access-key") {
          return {
            ...acc,
            accessKeys: {
              ...acc.accessKeys,
              [item.did]: [...(acc.accessKeys[item.did] || []), { key: item.key, path: item.path }],
            },
          }
        } else if (item.type === "ucan") {
          return { ...acc, ucans: [...acc.ucans, item.ucan] }
        } else {
          return acc
        }
      },
      {
        accessKeys: {},
        ucans: [],
      } as {
        accessKeys: Record<string, { key: Uint8Array; path: Path.Distinctive<Path.Segments> }[]>
        ucans: Ucan.Ucan[]
      }
    )

    this.accessKeys = accessKeys
    this.ucans = ucans

    this.ucansIndexedByAudience = ucans.reduce(
      (acc: Record<string, Ucan.Ucan[]>, ucan) => {
        return {
          ...acc,
          [ucan.payload.aud]: [...(acc[ucan.payload.aud] || []), ucan],
        }
      },
      {}
    )

    this.ucansIndexedByCID = entries.reduce(
      (acc: Record<string, Ucan.Ucan>, [k, v]) => {
        if (v.type !== "ucan") return acc
        return {
          ...acc,
          [k]: v.ucan,
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

  addUcan(ucan: Ucan.Ucan): Promise<void> {
    return this.addUcans([ucan])
  }

  addUcans(ucans: Ucan.Ucan[]): Promise<void> {
    return this.add(ucans.map(u => ({ type: "ucan", ucan: u })))
  }

  addAccessKey(item: { did: string; key: Uint8Array; path: Path.Distinctive<Path.Segments> }) {
    return this.addAccessKeys([item])
  }

  addAccessKeys(items: { did: string; key: Uint8Array; path: Path.Distinctive<Path.Segments> }[]) {
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

    case "ucan":
      if ("ucan" in item && isString(item.ucan)) {
        return {
          type: item.type,
          ucan: Ucan.decode(item.ucan),
        }
      } else {
        throw new Error("Encoded ucan cabinet-item did not have the expected `ucan attribute")
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
    case "ucan":
      return { type: "ucan", ucan: Ucan.encode(item.ucan) }
  }
}
