import * as Storage from "./components/storage/implementation.js"
import * as Events from "./events/index.js"

////////
// 🧩 //
////////

export type RepositoryOptions = {
  storage: Storage.Implementation
  storageName: string
}

///////////
// CLASS //
///////////

export default abstract class Repository<C, I> {
  events: Events.Emitter<Events.Repositories<C>>
  collection: C
  storage: Storage.Implementation
  storageName: string

  abstract emptyCollection(): C
  abstract mergeCollections(a: C, b: C): C
  abstract toCollection(item: I): Promise<C>

  constructor({ storage, storageName }: RepositoryOptions) {
    this.collection = this.emptyCollection()
    this.events = Events.createEmitter()
    this.storage = storage
    this.storageName = storageName
  }

  static async create(options: RepositoryOptions) {
    // @ts-ignore
    const repo = new this.prototype.constructor(options)

    const storage = await repo.storage.getItem(repo.storageName)
    const storedItems = storage ? repo.fromJSON(storage) : repo.emptyCollection()

    repo.collection = storedItems
    await repo.collectionUpdateCallback(storedItems)
    repo.events.emit("collection:changed", { collection: storedItems })

    return repo
  }

  async add(newItems: I[]): Promise<void> {
    const col = await newItems.reduce(
      async (acc: Promise<C>, item) => this.mergeCollections(await acc, await this.toCollection(item)),
      Promise.resolve(this.collection)
    )

    this.collection = col
    await this.collectionUpdateCallback(col)
    this.events.emit("collection:changed", { collection: col })

    await this.storage.setItem(
      this.storageName,
      this.toJSON(this.collection)
    )
  }

  clear(): Promise<void> {
    this.collection = this.emptyCollection()
    return this.storage.removeItem(this.storageName)
  }

  async collectionUpdateCallback(collection: C) {}

  // ENCODING

  fromJSON(a: string): C {
    return JSON.parse(a)
  }

  toJSON(a: C): string {
    return JSON.stringify(a)
  }
}
