
import * as browserCrypto from '../crypto/browser'
import crypto from 'crypto'

import { Storage } from '../../tests/storage/inMemory'
import { setDependencies } from './dependencies'

// FIXME: Upgrade @node/types as soon as webcrypto types are available
// @ts-ignore
const webcrypto: Crypto = crypto.webcrypto
globalThis.crypto = webcrypto

export const sha256 = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const buf = bytes.buffer
  const hash = await webcrypto.subtle.digest('SHA-256', buf)
  return new Uint8Array(hash)
}

const inMemoryStorage = new Storage()

export const JEST_IMPLEMENTATION = {
  hash: {
    sha256: sha256
  },
  aes: {
    encrypt: browserCrypto.encrypt,
    decrypt: browserCrypto.decrypt,
    genKeyStr: browserCrypto.genKeyStr,
    decryptGCM: browserCrypto.decryptGCM,
  },
  rsa: {
    verify: browserCrypto.rsaVerify
  },
  ed25519: {
    verify: browserCrypto.ed25519Verify
  },
  keystore: {
    publicReadKey: browserCrypto.ksPublicReadKey,
    publicWriteKey: browserCrypto.ksPublicWriteKey,
    decrypt: browserCrypto.ksDecrypt,
    sign: browserCrypto.ksSign,
    importSymmKey: browserCrypto.ksImportSymmKey,
    exportSymmKey: browserCrypto.ksExportSymmKey,
    keyExists: browserCrypto.ksKeyExists,
    getAlg: browserCrypto.ksGetAlg,
    clear: browserCrypto.ksClear,
  },
  storage: {
    getItem: inMemoryStorage.getItem,
    setItem: inMemoryStorage.setItem,
    removeItem: inMemoryStorage.removeItem,
    clear: inMemoryStorage.clear,
  }
}

setDependencies(JEST_IMPLEMENTATION) 