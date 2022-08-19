import tweetnacl from "tweetnacl"
import * as path from "path"
import * as fs from "fs"
import utils from "keystore-idb/lib/utils.js"
import rsa from "keystore-idb/lib/rsa/index.js"

import { Storage } from "../../tests/helpers/in-memory-storage.js"

import * as cryptoImpl from "../crypto/implementation.js"
import * as storageImpl from "../storage/implementation.js"

import * as setup from "../setup.js"
import InMemoryRSAKeyStore from "./node/keystore/store/memory.js"


setup.shouldPin({ enabled: false })

setup.wnfsWasmLoopkup(async () => {
  const pathToThisModule = new URL(import.meta.url).pathname
  const dirOfThisModule = path.parse(pathToThisModule).dir
  return fs.readFileSync(path.join(dirOfThisModule, `../../node_modules/wnfs/wasm_wnfs_bg.wasm`))
})


//-------------------------------------
// Crypto node implementations
//-------------------------------------

const rsaVerify = (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> => {
  const keyStr = utils.arrBufToBase64(publicKey.buffer)
  return rsa.verify(message, signature, keyStr)
}

const ed25519Verify = async (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> => {
  return tweetnacl.sign.detached.verify(message, signature, publicKey)
}


//-------------------------------------
// Dependency Injection Implementation
//-------------------------------------

const getKeystore = (() => {
  let keystore: null | InMemoryRSAKeyStore = null

  return async function get() {
    if (keystore == null) {
      keystore = await InMemoryRSAKeyStore.init()
    }
    return keystore
  }
})()


const inMemoryStorage = new Storage()


cryptoImpl.set({
  rsa: {
    verify: rsaVerify
  },
  ed25519: {
    verify: ed25519Verify
  },
  keystore: {
    async publicExchangeKey(): Promise<string> {
      const ks = await getKeystore()
      return ks.publicExchangeKey()
    },
    async publicWriteKey(): Promise<string> {
      const ks = await getKeystore()
      return ks.publicWriteKey()
    },
    async decrypt(encrypted: string): Promise<string> {
      const ks = await getKeystore()
      return ks.decrypt(encrypted)
    },
    async sign(message: string, charSize: number): Promise<string> {
      const ks = await getKeystore()
      return ks.sign(message, { charSize })
    },
    async importSymmKey(key: string, name: string): Promise<void> {
      const ks = await getKeystore()
      return ks.importSymmKey(key, name)
    },
    async exportSymmKey(name: string): Promise<string> {
      const ks = await getKeystore()
      return ks.exportSymmKey(name)
    },
    async keyExists(name:string): Promise<boolean> {
      const ks = await getKeystore()
      return ks.keyExists(name)
    },
    async getAlg(): Promise<string> {
      const ks = await getKeystore()
      return ks.cfg.type
    },
    async clear(): Promise<void> {
      return
    },
  }
})


storageImpl.set({
  getItem: inMemoryStorage.getItem,
  setItem: inMemoryStorage.setItem,
  removeItem: inMemoryStorage.removeItem,
  clear: inMemoryStorage.clear,
})
