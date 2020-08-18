import localforage from 'localforage'

import * as ucan from '../ucan'
import { UCANS_STORAGE_KEY } from '../common'
import { Prerequisites } from './prerequisites'
import { Ucan } from '../ucan'


let dictionary: { [string]: Ucan } = {}


// FUNCTIONS


/**
 * You didn't see anything 👀
 */
export async function clearStorage(): Promise<void> {
  dictionary = {}
  await localforage.removeItem(UCANS_STORAGE_KEY)
}


/**
 * Store UCANs and update the in-memory dictionary.
 */
export async function store(ucans: Array<string>): Promise<void> {
  const existing = await localforage.getItem(UCANS_STORAGE_KEY)
  const newList = (existing || []).concat(ucans)

  dictionary = ucan.compileDictionary(newList)

  const filteredList = listFromDictionary()
  const encodedList = filteredList.map(ucan.encode)

  await localforage.setItem(UCANS_STORAGE_KEY, encodedList)
}


/**
 * See if the stored UCANs in the in-memory dictionary
 * conform to the given `Prerequisites`.
 */
export function validatePrerequisites(
  { app, fs }: Prerequisites
): boolean {
  const currentTimeInSeconds = Math.floor(Date.now() / 1000)

  if (app) {
    const appUcan = dictionary[`wnfs:private/Apps/${app.creator}/${app.name}`]
    if (!appUcan || appUcan.exp <= currentTimeInSeconds) return false
  }

  if (fs && fs.privatePaths) {
    const priv = fs.privatePaths.every(path => {
      const ucan = dictionary[`wnfs:private/${path}`]
      return ucan && ucan.exp > currentTimeInSeconds
    })
    if (!priv) return false
  }

  if (fs && fs.publicPaths) {
    const publ = fs.publicPaths.every(path => {
      const ucan = dictionary[`wnfs:public/${path}`]
      return ucan && ucan.exp > currentTimeInSeconds
    })
    if (!publ) return false
  }
}



// ㊙️


function listFromDictionary(): Array<string> {
  return Object.values(dictionary)
}
