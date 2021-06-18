import { impl } from '../setup/dependencies'


export const getItem = <T>(key: string): Promise<T | null> => 
  impl.storage.getItem(key)

export const setItem = <T>(key: string, val: T): Promise<T> => 
  impl.storage.setItem(key, val)

export const removeItem = (key: string): Promise<void> => 
  impl.storage.removeItem(key)

export const clear = (): Promise<void> => 
  impl.storage.clear()
