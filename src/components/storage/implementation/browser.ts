import localforage from "localforage"

import { Implementation, ImplementationOptions } from "../implementation.js"
import { assertBrowser } from "../../../common/browser.js"


export function getItem<T>(db: LocalForage, key: string): Promise<T | null> {
  assertBrowser("storage.getItem")
  // return db.getItem(`${namespace}:${key}`)
  return db.getItem(key)
}

export function setItem<T>(db: LocalForage, key: string, val: T): Promise<T> {
  assertBrowser("storage.setItem")
  // return db.setItem(`${namespace}:${key}`, val)
  return db.setItem(key, val)
}

export function removeItem(db: LocalForage, key: string): Promise<void> {
  assertBrowser("storage.removeItem")
  // return db.removeItem(`${namespace}:${key}`)
  return db.removeItem(key)
}

export async function clear(db: LocalForage): Promise<void> {
  assertBrowser("storage.clear")
  // return (await db.keys()).reduce(
  //   (promise: Promise<void>, key: string) => {
  //     return promise.then(async _ => {
  //       key.startsWith(`${namespace}:`)
  //         ? await db.removeItem(key)
  //         : void
  //     })
  //   },
  //   Promise.resolve()
  // )
  return db.clear()
}



// 🛳


export function implementation({ name }: ImplementationOptions): Implementation {
  const db = localforage.createInstance({ name })
  const withDb = (func: Function) => (...args: unknown[]) => func(db, ...args)

  return {
    KEYS: {
      ACCOUNT_UCAN: "webnative.account_ucan",
      CID_LOG: "webnative.cid_log",
      SESSION: "webnative.session",
      UCANS: "webnative.permissioned_ucans",
    },

    getItem: withDb(getItem),
    setItem: withDb(setItem),
    removeItem: withDb(removeItem),
    clear: withDb(clear),
  }
}
