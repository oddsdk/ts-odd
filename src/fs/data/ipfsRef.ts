import type { CID, IPFS } from "ipfs-core"

export interface PersistenceOptions {
    // cache: CacheManager
    ipfs: IPFS
    signal?: AbortSignal
}

export interface IpfsPersistence<T> {
    toCID(object: T, options: PersistenceOptions): Promise<IpfsRef<T>>
    /** Will throw an error if the data behind the CID can't be parsed to type T */
    fromCID(cid: IpfsRef<T>, options: PersistenceOptions): Promise<T>
}

/** 
 * An Ipfs Ref is just a CID with a typescript type attached
 * which is the kind of object that's expected at the CID.
 */
export type IpfsRef<T> = CID // eslint-disable-line @typescript-eslint/no-unused-vars
