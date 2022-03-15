export type EventListener<E> = (event: E) => void

export interface EventSource<EventMap> /* extends EventTarget */ {
  addEventListener<K extends keyof EventMap>(eventName: K, listener: EventListener<EventMap[K]>): void
  removeEventListener<K extends keyof EventMap>(eventName: K, listener: EventListener<EventMap[K]>): void
}

export class EventEmitter<EventMap> implements EventSource<EventMap> {
  private readonly events: Map<keyof EventMap, Set<EventListener<unknown>>> = new Map()

  public addEventListener<K extends keyof EventMap>(eventName: K, listener: EventListener<EventMap[K]>): void {
    const eventSet = this.events.get(eventName)
    if (eventSet == null) {
      this.events.set(eventName, new Set([listener]) as Set<EventListener<unknown>>)
    } else {
      eventSet.add(listener as EventListener<unknown>)
    }
  }

  public removeEventListener<K extends keyof EventMap>(eventName: K, listener: EventListener<EventMap[K]>): void {
    const eventSet = this.events.get(eventName)
    if (eventSet == null) return
    eventSet.delete(listener as EventListener<unknown>)
    if (eventSet.size === 0) {
      this.events.delete(eventName)
    }
  }

  public dispatchEvent<K extends keyof EventMap>(eventName: K, event: EventMap[K]): void {
    this.events.get(eventName)?.forEach((listener: EventListener<EventMap[K]>) => {
      listener.apply(this, [event])
    })
  }
}