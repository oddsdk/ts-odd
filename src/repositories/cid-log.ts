import { CID } from "multiformats/cid"

import * as Storage from "../components/storage/implementation"
import { decodeCID } from "../common/cid.js"
import Repository, { RepositoryOptions } from "../repository.js"


export function create({ storage }: { storage: Storage.Implementation }): Promise<Repo> {
  return Repo.create({
    storage,
    storageName: storage.KEYS.CID_LOG
  })
}


// CLASS


export class Repo extends Repository<CID> {

  private constructor(options: RepositoryOptions) {
    super(options)
  }

  fromJSON(a: string): CID {
    return decodeCID(a)
  }

  toJSON(a: CID): string {
    return a.toString()
  }

  indexOf(item: CID): number {
    return this.memoryCache.map(
      c => c.toString()
    ).indexOf(
      item.toString()
    )
  }

  newest(): CID {
    return this.memoryCache[ this.memoryCache.length - 1 ]
  }

}