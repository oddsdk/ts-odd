export type EventListener<E> = (event: E) => void


export class EventEmitter<EventMap> {
  private readonly events: Map<keyof EventMap, Set<EventListener<unknown>>> = new Map()

  public addListener<K extends keyof EventMap>(eventName: K, listener: EventListener<EventMap[ K ]>): void {
    const eventSet = this.events.get(eventName)

    if (eventSet === undefined) {
      this.events.set(eventName, new Set([ listener ]) as Set<EventListener<unknown>>)
    } else {
      eventSet.add(listener as EventListener<unknown>)
    }
  }

  public removeListener<K extends keyof EventMap>(eventName: K, listener: EventListener<EventMap[ K ]>): void {
    const eventSet = this.events.get(eventName)
    if (eventSet === undefined) return

    eventSet.delete(listener as EventListener<unknown>)

    if (eventSet.size === 0) {
      this.events.delete(eventName)
    }
  }

  on = this.addListener
  off = this.removeListener

  public emit<K extends keyof EventMap>(eventName: K, event: EventMap[ K ]): void {
    this.events.get(eventName)?.forEach((listener: EventListener<EventMap[ K ]>) => {
      listener.apply(this, [ event ])
    })
  }
}