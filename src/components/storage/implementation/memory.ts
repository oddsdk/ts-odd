import { KEYS } from "./keys/default.js"
import { Implementation, ImplementationOptions } from "../implementation.js"


export async function getItem<T>(mem: Record<string, T>, key: string): Promise<T | null> {
  return mem[ key ]
}

export async function setItem<T>(mem: Record<string, T>, key: string, val: T): Promise<T> {
  mem[ key ] = val
  return val
}

export async function removeItem<T>(mem: Record<string, T>, key: string): Promise<void> {
  delete mem[ key ]
}

export async function clear<T>(mem: Record<string, T>): Promise<void> {
  for (const k in mem) delete mem[ k ]
}



// 🛳


export function implementation(): Implementation {
  const mem: Record<string, any> = {}

  return {
    KEYS,

    getItem: (...args) => getItem(mem, ...args),
    setItem: (...args) => setItem(mem, ...args),
    removeItem: (...args) => removeItem(mem, ...args),
    clear: (...args) => clear(mem, ...args),
  }
}
