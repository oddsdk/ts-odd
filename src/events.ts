import { CID } from "./common/cid.js"
import { EventEmitter } from "./common/event-emitter.js"
import { DistinctivePath, Partition, Partitioned } from "./path/index.js"


export { EventEmitter, EventEmitter as Emitter }


export type FileSystem = {
  "local-change": { root: CID; path: DistinctivePath<Partitioned<Partition>> }
  "published": { root: CID }
}


export function createEmitter<E>(): EventEmitter<E> {
  return new EventEmitter()
}