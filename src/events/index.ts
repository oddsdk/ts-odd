import Emittery from "emittery"

import { CID } from "../common/cid.js"
import { DistinctivePath, Partition, Partitioned } from "../path/index.js"
import { Ucan } from "../ucan/types.js"

export type Emitter<EventMap extends Record<string, unknown>> = InstanceType<typeof Emittery<EventMap, EventMap>>
export type Listener<EventMap extends Record<string, unknown>, Name extends keyof EventMap> = (
  eventData: EventMap[Name]
) => void | Promise<void>

export { Emitter as EventEmitter, Listener as EventListener }

/** @protected */
export { Emittery as EmitterClass }

/**
 * Events interface.
 *
 * Subscribe to events using `on` and unsubscribe using `off`.
 * There's also `once`, `onAny`, `offAny`, `anyEvent` and `events`.
 *
 * ```ts
 * fileSystem.on("local-change", ({ path, root }) => {
 *   console.log("The file system has changed locally 🔔")
 *   console.log("Changed path:", path)
 *   console.log("New data root CID:", root)
 * })
 *
 * fileSystem.off("publish")
 * ```
 */
export type ListenTo<EventMap extends Record<string, unknown>> = Pick<
  Emitter<EventMap>,
  "on" | "onAny" | "off" | "offAny" | "once" | "anyEvent" | "events"
>

export type AuthorityRequestor = {
  "challenge": undefined // TODO
}

export type AuthorityProvider = {
  "approved": undefined
  "challenge": undefined // TODO
  "dismissed": undefined
  "query": Record<string, any> // TODO
}

export type FileSystem = {
  "local-change": { dataRoot: CID; path: DistinctivePath<Partitioned<Partition>> }
  "publish": { dataRoot: CID; proofs: Ucan[] }
}

export type Program = {
  "offline": void
  "online": void
}

export type Repositories<Collection> = {
  "collection:changed": { collection: Collection }
}

export function createEmitter<EventMap extends Record<string, unknown>>(): Emitter<EventMap> {
  return new Emittery<EventMap, EventMap>()
}

export function listenTo<EventMap extends Record<string, unknown>>(emitter: Emitter<EventMap>): ListenTo<EventMap> {
  return {
    on: emitter.on.bind(emitter),
    onAny: emitter.onAny.bind(emitter),
    off: emitter.off.bind(emitter),
    offAny: emitter.offAny.bind(emitter),
    once: emitter.once.bind(emitter),
    anyEvent: emitter.anyEvent.bind(emitter),
    events: emitter.events.bind(emitter),
  }
}
