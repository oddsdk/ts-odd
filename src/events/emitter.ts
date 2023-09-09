import Emittery from "emittery"

export type Emitter<EventMap extends Record<string, unknown>> = InstanceType<typeof Emittery<EventMap, EventMap>>
export { Emitter as EventEmitter }

/** @protected */
export { Emittery as EmitterClass }

export function createEmitter<EventMap extends Record<string, unknown>>(): Emitter<EventMap> {
  return new Emittery<EventMap, EventMap>()
}
