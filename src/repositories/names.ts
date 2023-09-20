import * as Storage from "../components/storage/implementation.js"
import Repository, { RepositoryOptions } from "../repository.js"

////////
// 🧩 //
////////

/** @internal */
export type Item = {
  name: string
  subject: string // ie. the thing that is being named
}

/** @internal */
export type Collection = Record<string, string>

////////
// 🛠️ //
////////

export function create({ storage }: { storage: Storage.Implementation }): Promise<Repo> {
  return Repo.create({
    storage,
    storageName: storage.KEYS.NAMES,
  })
}

///////////
// CLASS //
///////////

export { Repo as Names }

export class Repo extends Repository<Collection, Item> {
  private constructor(options: RepositoryOptions) {
    super(options)
  }

  // IMPLEMENTATION

  emptyCollection() {
    return {}
  }

  mergeCollections(a: Collection, b: Collection): Collection {
    return {
      ...a,
      ...b,
    }
  }

  async toCollection(item: Item): Promise<Collection> {
    return { [item.name]: item.subject }
  }

  // 🛠️

  resolveId(id: { did: string } | { name: string }): string | null {
    if ("did" in id) {
      return id.did
    } else {
      return this.subject(id.name)
    }
  }

  subject(name: string): string | null {
    return this.collection[name] || null
  }
}
