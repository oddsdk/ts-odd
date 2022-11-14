import * as Storage from "./components/storage/implementation"
import * as TypeChecks from "./common/type-checks.js"


export type RepositoryOptions = {
  storage: Storage.Implementation
  storageName: string
}


export default abstract class Repository<T> {

  dictionary: Record<string, T>
  memoryCache: T[]
  storage: Storage.Implementation
  storageName: string


  constructor({ storage, storageName }: RepositoryOptions) {
    this.memoryCache = []
    this.dictionary = {}
    this.storage = storage
    this.storageName = storageName
  }

  static async create<T>(options: RepositoryOptions) {
    // @ts-ignore
    const repo = new this.prototype.constructor(options)

    repo.memoryCache = await repo.getAll()
    repo.dictionary = repo.toDictionary(repo.memoryCache)

    return repo
  }

  async add(itemOrItems: T | T[]): Promise<void> {
    const items = Array.isArray(itemOrItems) ? itemOrItems : [ itemOrItems ]

    this.memoryCache = [ ...this.memoryCache, ...items ]
    this.dictionary = this.toDictionary(this.memoryCache)

    await this.storage.setItem(
      this.storageName,
      // TODO: JSON.stringify(this.memoryCache.map(this.toJSON))
      this.memoryCache.map(this.toJSON).join("|||")
    )
  }

  clear(): Promise<void> {
    this.memoryCache = []
    this.dictionary = {}

    return this.storage.removeItem(this.storageName)
  }

  find(predicate: (value: T, index: number) => boolean): T | null {
    return this.memoryCache.find(predicate) || null
  }

  getByIndex(idx: number): T | null {
    return this.memoryCache[ idx ]
  }

  async getAll(): Promise<T[]> {
    const storage = await this.storage.getItem(this.storageName)
    const storedItems = TypeChecks.isString(storage)
      // TODO: ? - Need partial JSON decoding for this
      ? storage.split("|||").map(this.fromJSON)
      : []

    return storedItems
  }

  indexOf(item: T): number {
    return this.memoryCache.indexOf(item)
  }

  length(): number {
    return this.memoryCache.length
  }


  // ENCODING

  fromJSON(a: string): T {
    return JSON.parse(a)
  }

  toJSON(a: T): string {
    return JSON.stringify(a)
  }


  // DICTIONARY

  getByKey(key: string): T | null {
    return this.dictionary[ key ]
  }

  toDictionary(items: T[]): Record<string, T> {
    return items.reduce(
      (acc, value, idx) => ({ ...acc, [ idx.toString() ]: value }),
      {}
    )
  }

}