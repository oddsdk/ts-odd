import * as storage from '../storage/index'
import { UCANS_STORAGE_KEY } from '../common/index'

let dictionary: Record<string, string> = {}

/**
 * Retrieve dictionary
 */
export function getDictionary(): Record<string, string> {
  return dictionary
}

/**
 * Retrieve dictionary
 */
export function setDictionary(updated: Record<string, string>): void {
  dictionary = updated
}

/**
 * You didn't see anything 👀
 */
export async function clearStorage(): Promise<void> {
  dictionary = {}
  await storage.removeItem(UCANS_STORAGE_KEY)
}


