import { CID } from "multiformats/cid"
import { base32 } from "multiformats/bases/base32"

import * as Storage from "../components/storage/implementation"
import { decodeCID } from "../common/cid.js"
import Repository from "../repository.js"


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

  toJSON(a: CID): string {
    return a.toString(base32.encoder)
  }

  newest(): CID {
    return this.memoryCache[ this.memoryCache.length - 1 ]
  }

}