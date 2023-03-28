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
 * program.fileSystem.off("publish")
 * ```
 */
export type ListenTo<EventMap> = Pick<
  EventEmitter<EventMap>,
  "addListener" | "removeListener" | "on" | "off"
>


export type FileSystem = {
  "local-change": { root: CID; path: DistinctivePath<Partitioned<Partition>> }
  "publish": { root: CID }
}


export type Session<S> = {
  "create": { session: S }
  "destroy": { username: string }
}


export function createEmitter<EventMap>(): EventEmitter<EventMap> {
  return new EventEmitter()
}


export function listenTo<EventMap>(emitter: EventEmitter<EventMap>): ListenTo<EventMap> {
  return {
    addListener: emitter.addListener.bind(emitter),
    removeListener: emitter.removeListener.bind(emitter),
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
  }
}