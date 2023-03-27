import { EventEmitter } from "./common/event-emitter.js"


export { EventEmitter, EventEmitter as Emitter }


/**
 * Events interface.
 *
 * Subscribe to events using `on` and unsubscribe using `off`,
 * alternatively you can use `addListener` and `removeListener`.
 *
 * ```ts
 * program.fileSystem.on("fileSystem:local-change", ({ path, root }) => {
 *   console.log("The file system has changed locally 🔔")
 *   console.log("Changed path:", path)
 *   console.log("New data root CID:", root)
 * })
 *
 * program.fileSystem.off("fileSystem:publish")
 * ```
 */
export type ListenTo<EventMap> = Pick<
  EventEmitter<EventMap>,
  "addListener" | "removeListener" | "on" | "off"
>


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