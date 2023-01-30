import { CID } from "./common/cid.js"
import { EventEmitter } from "./common/event-emitter.js"
import { DistinctivePath, Partition, Partitioned } from "./path/index.js"


export { EventEmitter, EventEmitter as Emitter }


/**
 * Events interface.
 *
 * Subscribe to events using `on` and unsubscribe using `off`,
 * alternatively you can use `addListener` and `removeListener`.
 *
 * ```ts
 * program.fileSystem.on("local-change", ({ path, root }) => {
 *   console.log("The file system has changed locally 🔔")
 *   console.log("Changed path:", path)
 *   console.log("New data root CID:", root)
 * })
 *
 * program.fileSystem.off("published")
 * ```
 */
export type ListenTo<Events> = Pick<
  EventEmitter<Events>,
  "addListener" | "removeListener" | "on" | "off"
>


export type FileSystem = {
  "local-change": { root: CID; path: DistinctivePath<Partitioned<Partition>> }
  "published": { root: CID }
}


export function createEmitter<E>(): EventEmitter<E> {
  return new EventEmitter()
}


export function listenTo<E>(emitter: EventEmitter<E>): ListenTo<E> {
  const { addListener, removeListener, on, off } = emitter
  return { addListener, removeListener, on, off }
}