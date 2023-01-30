export type EventListener<E> = (event: E) => void


export class EventEmitter<EventMap> {
  private readonly events: Map<
    keyof EventMap,
    Set<EventListener<EventMap[ keyof EventMap ]>>
  > = new Map()

  public addListener(
    eventName: keyof EventMap,
    listener: EventListener<EventMap[ keyof EventMap ]>
  ): void {
    const eventSet = this.events.get(eventName)

    if (eventSet === undefined) {
      this.events.set(eventName, new Set([ listener ]))
    } else {
      eventSet.add(listener)
    }
  }

  public removeListener(
    eventName: keyof EventMap,
    listener: EventListener<EventMap[ keyof EventMap ]>
  ): void {
    const eventSet = this.events.get(eventName)
    if (eventSet === undefined) return

    eventSet.delete(listener)

    if (eventSet.size === 0) {
      this.events.delete(eventName)
    }
  }

  on = this.addListener
  off = this.removeListener

  public emit(
    eventName: keyof EventMap,
    event: EventMap[ keyof EventMap ]
  ): void {
    this.events.get(eventName)?.forEach((listener: EventListener<EventMap[ keyof EventMap ]>) => {
      listener.apply(this, [ event ])
    })
  }
}