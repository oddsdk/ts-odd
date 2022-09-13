import { CID } from "multiformats/cid"

import * as Storage from "../components/storage/implementation"
import { decodeCID } from "../common"
import Repository from "../repository"


export function create({ storage }: { storage: Storage.Implementation }): Repository<CID> {
  const repo = new Repository({
    storage,
    storageName: storage.KEYS.CID_LOG
  }) as Repository<CID> // TODO: Can I remove this `as` statement somehow?

  repo.fromJSON = decodeCID

  return repo
}


export function newest(repo: Repository<CID>): CID {
  return repo.memoryCache[ repo.memoryCache.length - 1 ]
}