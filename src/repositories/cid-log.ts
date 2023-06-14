import { CID } from "multiformats/cid"

import * as Storage from "../components/storage/implementation"
import { decodeCID, encodeCID } from "../common/cid.js"
import Repository, { RepositoryOptions } from "../repository.js"


export function create({ storage }: { storage: Storage.Implementation }): Promise<Repo> {
  return Repo.create({
    storage,
    storageName: storage.KEYS.CID_LOG
  })
}


// CLASS


export class Repo extends Repository<CID[], CID> {

  private constructor(options: RepositoryOptions) {
    super(options)
  }


  // IMPLEMENTATION

  emptyCollection() {
    return []
  }

  mergeCollections(a: CID[], b: CID[]): CID[] {
    return [
      ...a,
      ...b
    ]
  }

  async toCollection(item: CID): Promise<CID[]> {
    return [ item ]
  }


  // ENCODING

  fromJSON(a: string): CID[] {
    return JSON.parse(a).map(decodeCID)
  }

  toJSON(a: CID[]): string {
    return JSON.stringify(
      a.map(encodeCID)
    )
  }


  // 🛠️

  find(predicate: (value: CID, index: number) => boolean): CID | null {
    return this.collection.find(predicate) || null
  }

  getByIndex(idx: number): CID | null {
    return this.collection[ idx ]
  }

  getAll(): CID[] {
    return this.collection
  }

  indexOf(item: CID): number {
    return this.collection.map(
      c => c.toString()
    ).indexOf(
      item.toString()
    )
  }

  length(): number {
    return this.collection.length
  }

  newest(): CID {
    return this.collection[ this.collection.length - 1 ]
  }

}