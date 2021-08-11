import { IPFS, CID } from "ipfs-core"


export interface Ref<T, R, Options> {
  get(options: Options): Promise<T>
  ref(options: Options): Promise<R>
  /** Convenience function to make JSON.serialize work better with a custom replacer */
  toObject(): T | string
}


export type LazyCIDRef<T> = Ref<T, CID, PersistenceOptions>


export interface PersistenceOptions {
  signal?: AbortSignal
  ipfs: IPFS
}


export type FromCID<T> = (cid: CID, options: PersistenceOptions) => Promise<T>
export type ToCID<T> = (obj: T, options: PersistenceOptions) => Promise<CID>


export const lazyRefFromCID = <T>(cid: CID, load: FromCID<T>): LazyCIDRef<T> => {

  // We store a promise so if multiple concurrent processes call `get`, they'll all wait for the same promise.
  let obj: Promise<T> | null = null
  // The loadedObj should then just be whatever the fulfilled `obj` promise resolves to
  // It's just used for the `toObject` method for convenience
  let loadedObj: T | null = null

  return {

    async get(options: PersistenceOptions) {
      if (obj == null) {
        obj = load(cid, options).then(loaded => loadedObj = loaded)
      }
      return await obj
    },

    async ref() {
      return cid
    },

    toObject() {
      if (loadedObj != null) {
        return loadedObj
      }
      return cid.toString()
    },

  }
}


export const lazyRefFromObj = <T>(obj: T, store: ToCID<T>): LazyCIDRef<T> => {

  // We store a promise so that multiple concurrent `ref` calls will all await the same promise.
  let cid: Promise<CID> | null = null

  return {

    async get() {
      return obj
    },

    async ref(options: PersistenceOptions) {
      if (cid == null) {
        cid = store(obj, options)
      }
      return await cid
    },

    toObject() {
      return obj
    },

  }
}


// Just an example to illustrate why the abstractness
/*
export interface PrivateOptions {
  mmpt: MMPT
}

export type LazyPrivateNameRef<T> = Ref<T, PrivateName, PersistenceOptions & PrivateOptions>

*/