import * as DagPB from "@ipld/dag-pb"
import * as Raw from "multiformats/codecs/raw"
import { sha256 } from "multiformats/hashes/sha2"

import * as Auth from "../../src/components/auth/implementation.js"
import * as Confidences from "../../src/components/confidences/implementation.js"
import * as Depot from "../../src/components/depot/implementation.js"
import * as Reference from "../../src/components/reference/implementation.js"
import * as Storage from "../../src/components/storage/implementation.js"

import * as BaseReference from "../../src/components/reference/implementation/base.js"
import * as BrowserCrypto from "../../src/components/crypto/implementation/browser.js"
import * as ProperManners from "../../src/components/manners/implementation/base.js"
import * as WnfsAuth from "../../src/components/auth/implementation/wnfs.js"

import * as DID from "../../src/did/index.js"

import { BlockCodec, CID } from "multiformats"
import { Configuration } from "../../src/configuration.js"
import { Ucan } from "../../src/ucan/types.js"
import { decodeCID, EMPTY_CID } from "../../src/common/cid.js"


// 🚀


export const configuration: Configuration = {
  appInfo: { name: "Webnative Tests", creator: "Fission" },
  debug: true,
  filesystem: {
    loadImmediately: false
  },
}

const crypto = await BrowserCrypto.implementation({ storeName: "tests", exchangeKeyName: "exchange-key", writeKeyName: "write-key" })
const manners = ProperManners.implementation({ configuration })



// DEPOT


const inMemoryDepot: Record<string, Uint8Array> = {}


const depot: Depot.Implementation = {
  // Get the data behind a CID
  getBlock: (cid: CID) => {
    const data = inMemoryDepot[ cid.toString() ]
    if (!data) throw new Error("CID not stored in depot")
    return Promise.resolve(data)
  },
  getUnixFile: (cid: CID) => depot.getBlock(cid),
  getUnixDirectory: async (cid: CID) => {
    const dag = DagPB.decode(await depot.getBlock(cid))

    // Not technically correct but might be good enough for testing?
    return dag.Links.map(link => ({
      cid: link.Hash,
      name: link.Name || "",
      size: link.Tsize || 0,
      isFile: link.Hash.code === Raw.code
    }))
  },

  // Keep data around
  putBlock: async (data: Uint8Array, codec: BlockCodec<number, any>) => {
    const multihash = await sha256.digest(data)
    const cid = new CID(1, codec.code, multihash, data)

    inMemoryDepot[ cid.toString() ] = data

    return cid
  },
  putChunked: async (data: Uint8Array) => {
    // Not sure what the max size is here, this might not work.
    // Might need to use https://github.com/ipfs/js-ipfs-unixfs/tree/master/packages/ipfs-unixfs-importer instead.
    const multihash = await sha256.digest(data)
    const cid = new CID(1, Raw.code, multihash, data)

    inMemoryDepot[ cid.toString() ] = data

    return {
      cid,
      size: data.length,
      isFile: true
    }
  },

  // Stats
  size: async (cid: CID) => {
    const data = await depot.getBlock(cid)
    return data.length
  }
}



// STORAGE


let inMemoryStorage: Record<string, any> = {}


const storage: Storage.Implementation = {
  KEYS: {
    ACCOUNT_UCAN: "account-ucan",
    CID_LOG: "cid-log",
    SESSION: "session",
    UCANS: "permissioned-ucans",
  },

  clear: () => { inMemoryStorage = {}; return Promise.resolve() },
  getItem: (key: string) => Promise.resolve(inMemoryStorage[ key ]),
  removeItem: (key: string) => { delete inMemoryStorage[ key ]; return Promise.resolve() },
  setItem: <T>(key: string, val: T) => { inMemoryStorage[ key ] = val; return Promise.resolve(val) },
}


// REFERENCE


const baseReference = BaseReference.implementation({
  crypto, manners, storage
})

const inMemoryReference = {
  dataRoot: decodeCID(EMPTY_CID)
}

const reference: Reference.Implementation = {
  ...baseReference,

  dataRoot: {
    domain: () => { throw new Error("Not implemented") },
    lookup: () => Promise.resolve(inMemoryReference.dataRoot),
    update: (cid: CID, proof: Ucan) => { inMemoryReference.dataRoot = cid; return Promise.resolve({ success: true }) }
  },
  didRoot: {
    lookup: () => DID.write(crypto)
  },
}



// CONFIDENCES


const confidences: Confidences.Implementation = {
  collect: () => { throw new Error("Not implemented") },
  request: (options: Confidences.RequestOptions) => { throw new Error("Not implemented") },
}



// AUTH


const auth: Auth.Implementation = WnfsAuth.implementation({
  crypto, reference, storage
})


export const username = "test"
export const account = {
  rootDID: await reference.didRoot.lookup(username),
  username
}



// 🛳


const components = {
  auth,
  confidences,
  crypto,
  depot,
  manners,
  reference,
  storage
}

export {
  components,

  auth,
  confidences,
  crypto,
  depot,
  manners,
  reference,
  storage
}