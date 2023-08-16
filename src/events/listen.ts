import { Emitter } from "./emitter.js"

export type Listener<EventMap extends Record<string, unknown>, Name extends keyof EventMap> = (
  eventData: EventMap[Name]
) => void | Promise<void>
export { Listener as EventListener }

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
