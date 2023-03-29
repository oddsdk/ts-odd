import type LocalForage from "localforage"

import NodeFs from "fs"
import NodePath from "path"

import { CID } from "multiformats"
import { CryptoSystem, HashAlg, KeyUse } from "keystore-idb/types.js"
import { MemoryBlockstore } from "blockstore-core/memory"
import { default as KeystoreConfig } from "keystore-idb/config.js"
import { sha256 } from "multiformats/hashes/sha2"
import IDB from "keystore-idb/idb.js"
import RSAKeys from "keystore-idb/rsa/keys.js"
import RSAKeyStore from "keystore-idb/rsa/keystore.js"

import * as Auth from "../../src/components/auth/implementation.js"
import * as Crypto from "../../src/components/crypto/implementation.js"
import * as Capabilities from "../../src/components/capabilities/implementation.js"
import * as Depot from "../../src/components/depot/implementation.js"
import * as Reference from "../../src/components/reference/implementation.js"
import * as Storage from "../../src/components/storage/implementation.js"

import * as BaseReference from "../../src/components/reference/implementation/base.js"
import * as BrowserCrypto from "../../src/components/crypto/implementation/browser.js"
import * as MemoryStorage from "../../src/components/storage/implementation/memory.js"
import * as ProperManners from "../../src/components/manners/implementation/base.js"
import * as WnfsAuth from "../../src/components/auth/implementation/wnfs.js"

import * as Codecs from "../../src/dag/codecs.js"
import * as DID from "../../src/did/index.js"
import * as Ucans from "../../src/ucan/index.js"

import { CodecIdentifier } from "../../src/dag/codecs.js"
import { Components } from "../../src/components.js"
import { Configuration } from "../../src/configuration.js"
import { Ucan } from "../../src/ucan/types.js"
import { decodeCID, EMPTY_CID } from "../../src/common/cid.js"
import { Storage as LocalForageStore } from "./localforage/in-memory-storage.js"


// 🚀


export const configuration: Configuration = {
  namespace: { name: "ODD SDK Tests", creator: "Fission" },
  debug: false,
  fileSystem: {
    loadImmediately: false
  },
}



// CRYPTO


export async function createCryptoComponent(): Promise<Crypto.Implementation> {
  const cfg = KeystoreConfig.normalize({
    type: CryptoSystem.RSA,

    charSize: 8,
    hashAlg: HashAlg.SHA_256,
    storeName: "tests",
    exchangeKeyName: "exchange-key",
    writeKeyName: "write-key",
  })

  const { rsaSize, hashAlg, storeName, exchangeKeyName, writeKeyName } = cfg
  const store = new LocalForageStore() as unknown as LocalForage

  // NOTE: This would be a more type safe solution,
  //       but somehow localforage won't accept the driver.
  // await store.defineDriver(memoryDriver)
  // const store = localforage.createInstance({ name: storeName, driver: memoryDriver._driver })

  await IDB.createIfDoesNotExist(exchangeKeyName, () => (
    RSAKeys.makeKeypair(rsaSize, hashAlg, KeyUse.Exchange)
  ), store)
  await IDB.createIfDoesNotExist(writeKeyName, () => (
    RSAKeys.makeKeypair(rsaSize, hashAlg, KeyUse.Write)
  ), store)

  const ks = new RSAKeyStore(cfg, store)

  return {
    aes: BrowserCrypto.aes,
    did: BrowserCrypto.did,
    hash: BrowserCrypto.hash,
    misc: BrowserCrypto.misc,
    rsa: BrowserCrypto.rsa,

    keystore: {
      clearStore: () => BrowserCrypto.ksClearStore(ks),
      decrypt: (...args) => BrowserCrypto.ksDecrypt(ks, ...args),
      exportSymmKey: (...args) => BrowserCrypto.ksExportSymmKey(ks, ...args),
      getAlgorithm: (...args) => BrowserCrypto.ksGetAlgorithm(ks, ...args),
      getUcanAlgorithm: (...args) => BrowserCrypto.ksGetUcanAlgorithm(ks, ...args),
      importSymmKey: (...args) => BrowserCrypto.ksImportSymmKey(ks, ...args),
      keyExists: (...args) => BrowserCrypto.ksKeyExists(ks, ...args),
      publicExchangeKey: (...args) => BrowserCrypto.ksPublicExchangeKey(ks, ...args),
      publicWriteKey: (...args) => BrowserCrypto.ksPublicWriteKey(ks, ...args),
      sign: (...args) => BrowserCrypto.ksSign(ks, ...args),
    },
  }
}


const crypto = await createCryptoComponent()



// DEPOT


export const inMemoryDepot: Record<string, Uint8Array> = {}


const depot: Depot.Implementation = {
  blockstore: new MemoryBlockstore(),

  // Get the data behind a CID
  getBlock: (cid: CID) => {
    const data = inMemoryDepot[ cid.toString() ]
    if (!data) throw new Error("CID not stored in depot")
    return Promise.resolve(data)
  },

  // Keep data around
  putBlock: async (data: Uint8Array, codecId: CodecIdentifier) => {
    const codec = Codecs.getByIdentifier(codecId)
    const multihash = await sha256.digest(data)
    const cid = CID.createV1(codec.code, multihash)

    inMemoryDepot[ cid.toString() ] = data

    return cid
  }
}



// STORAGE


const storage: Storage.Implementation = MemoryStorage.implementation()



// MANNERS


const manners = {
  ...ProperManners.implementation({ configuration }),

  wnfsWasmLookup: async () => {
    const pathToThisModule = new URL(import.meta.url).pathname
    const dirOfThisModule = NodePath.parse(pathToThisModule).dir
    return NodeFs.readFileSync(NodePath.join(dirOfThisModule, `../../node_modules/wnfs/wnfs_wasm_bg.wasm`))
  }
}



// REFERENCE


const baseReference = await BaseReference.implementation({
  crypto, manners, storage
})

const inMemoryReference = {
  dataRoot: decodeCID(EMPTY_CID)
}

const reference: Reference.Implementation = {
  ...baseReference,

  dataRoot: {
    domain: () => "localhost",
    lookup: () => Promise.resolve(inMemoryReference.dataRoot),
    update: (cid: CID, proof: Ucan) => { inMemoryReference.dataRoot = cid; return Promise.resolve({ success: true }) }
  },
  didRoot: {
    lookup: () => DID.write(crypto)
  },
}



// CAPABILITIES


const capabilities: Capabilities.Implementation = {
  collect: () => { throw new Error("Not implemented") },
  request: (options: Capabilities.RequestOptions) => { throw new Error("Not implemented") },
}



// AUTH


const auth: Auth.Implementation<Components> = WnfsAuth.implementation({
  crypto, reference, storage
})


export const username = "test"
export const account = {
  rootDID: await reference.didRoot.lookup(username),
  username
}



// Add self-signed file-system UCAN


const issuer = await DID.write(crypto)
const proof: string | null = await storage.getItem(
  storage.KEYS.ACCOUNT_UCAN
)

const fsUcan = await Ucans.build({
  dependencies: { crypto },
  potency: "APPEND",
  resource: "*",
  proof: proof ? proof : undefined,
  lifetimeInSeconds: 60 * 60 * 24 * 30 * 12 * 1000, // 1000 years

  audience: issuer,
  issuer
})

await reference.repositories.ucans.add(fsUcan)



// 🛳


const components = {
  auth,
  capabilities,
  crypto,
  depot,
  manners,
  reference,
  storage
}

export {
  components,

  auth,
  capabilities,
  crypto,
  depot,
  manners,
  reference,
  storage
}