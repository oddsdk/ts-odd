import { CID } from "multiformats/cid"

import * as Storage from "../components/storage/implementation"
import { decodeCID } from "../common"
import Repository from "../repository"


export function create({ storage }: { storage: Storage.Implementation }): Repo {
  return new Repo({
    storage,
    storageName: storage.KEYS.CID_LOG
  })
}


// CLASS


export class Repo extends Repository<CID> {

  fromJSON(a: string): CID {
    return decodeCID(a)
  }

  newest(): CID {
    return this.memoryCache[ this.memoryCache.length - 1 ]
  }

}