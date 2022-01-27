export type EventListener = (...args: any[]) => void
type Events = { [event: string]: Set<EventListener> }

export class EventEmitter {
  private readonly events: Events = {}

  public addEventListener(event: string, listener: EventListener): void {
    if (typeof this.events[event] === "undefined") {
      this.events[event] = new Set()
    }
    this.events[event].add(listener)
  }

  public removeEventListener(event: string, listener: EventListener): void {
    this.events[event].delete(listener)
  }

  public dispatchEvent(event: string, ...args: unknown[]): void {
    this.events[event].forEach((listener: EventListener) => {
      listener.apply(this, args)
    })
  }
}