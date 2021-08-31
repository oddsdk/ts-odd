import type { IPFS } from "ipfs-core"
import CID from "cids"


/**
 * An abstraction over a mechanism that creates *immutable* references to data.
 * I.e. if the data changes - the reference changes.
 * One concrete example of this is content addressing.
 * Another example is the namefilters for private names in WNFS.
 */
export interface Ref<T, R, Ctx> {
  get(ctx: Ctx): Promise<T>
  ref(ctx: Ctx): Promise<R>
  /** Convenience function to make JSON.serialize work better with a custom replacer */
  toObject(): T | unknown
}


export type LazyCIDRef<T> = Ref<T, CID, OperationContext>


export interface OperationContext {
  signal?: AbortSignal
  ipfs: IPFS
}


export type FromCID<T> = (cid: CID, ctx: OperationContext) => Promise<T>
export type ToCID<T> = (obj: T, ctx: OperationContext) => Promise<CID>


export const lazyRefFromCID = <T>(cid: CID, load: FromCID<T>): LazyCIDRef<T> => {

  // We store a promise so if multiple concurrent processes call `get`, they'll all wait for the same promise.
  let obj: Promise<T> | null = null
  // The loadedObj should then just be whatever the fulfilled `obj` promise resolves to
  // It's just used for the `toObject` method for convenience
  let loadedObj: T | null = null

  return Object.freeze({

    async get(ctx: OperationContext) {
      if (obj == null) {
        obj = load(cid, ctx).then(loaded => loadedObj = loaded)
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

  })
}


export const lazyRefFromObj = <T>(obj: T, store: ToCID<T>): LazyCIDRef<T> => {

  // We store a promise so that multiple concurrent `ref` calls will all await the same promise.
  let cid: Promise<CID> | null = null

  return Object.freeze({

    async get() {
      return obj
    },

    async ref(ctx: OperationContext) {
      if (cid == null) {
        cid = store(obj, ctx)
      }
      return await cid
    },

    toObject() {
      return obj
    },

  })
}
