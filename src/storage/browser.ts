import localforage from 'localforage'
import { assertBrowser } from '../common/browser'

export const getItem = <T>(key: string): Promise<T | null> => {
  assertBrowser('storage.getItem')
  return localforage.getItem(key)
}

export const setItem = <T>(key: string, val: T): Promise<T> => {
  assertBrowser('storage.setItem')
  return localforage.setItem(key, val)
}

export const removeItem = (key: string): Promise<void> => {
  assertBrowser('storage.removeItem')
  return localforage.removeItem(key)
}

export const clear = (): Promise<void> => {
  assertBrowser('storage.clear')
  return localforage.clear()
}

