import { impl } from "./implementation.js"


export const getItem = <T>(key: string): Promise<T | null> =>
  impl.getItem(key)

export const setItem = <T>(key: string, val: T): Promise<T> =>
  impl.setItem(key, val)

export const removeItem = (key: string): Promise<void> =>
  impl.removeItem(key)

export const clear = (): Promise<void> =>
  impl.clear()
