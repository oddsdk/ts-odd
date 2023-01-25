import Emittery from "emittery"
import { CID } from "./common/cid.js"
import { DistinctivePath, Partition, Partitioned } from "./path/index.js"


export type Events = {
  "fileSystem:local-change": { root: CID; path: DistinctivePath<Partitioned<Partition>> }
  "fileSystem:published": { root: CID }
}


/**
 * Events interface.
 *
 * Subscribe to events using `on` or `once` (multiple events are allowed),
 * and unsubscribe using `off`.
 *
 * ```ts
 * program.events.on("fileSystem:local-change", ({ path, root }) => {
 *   console.log("The file system has changed locally 🔔")
 *   console.log("Changed path:", path)
 *   console.log("New data root CID:", root)
 * })
 *
 * program.events.off("fileSystem:published")
 * ```
 *
 * More info on the [emittery Github readme](https://github.com/sindresorhus/emittery/tree/f0b3c2bf8dc985a7dde0e39607e30950394be54b#usage).
 */
export type EventEmitter = Emittery<Events>


export function createEmitter(): EventEmitter {
  return new Emittery({
    debug: { name: "Webnative" }
  })
}