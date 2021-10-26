import * as browserCrypto from "../crypto/browser.js"
import * as browserStorage from "../storage/browser.js"

export const DEFAULT_IMPLEMENTATION: Dependencies = {
  rsa: {
    verify: browserCrypto.rsaVerify
  },
  ed25519: {
    verify: browserCrypto.ed25519Verify
  },
  keystore: {
    publicExchangeKey: browserCrypto.ksPublicExchangeKey,
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
    getItem: browserStorage.getItem,
    setItem: browserStorage.setItem,
    removeItem: browserStorage.removeItem,
    clear: browserStorage.clear,
  }
}

export let impl: Dependencies = DEFAULT_IMPLEMENTATION

export const setDependencies = (fns: Partial<Dependencies>): Dependencies => {
  impl = {
    rsa: merge(impl.rsa, fns.rsa),
    ed25519: merge(impl.ed25519, fns.ed25519),
    keystore: merge(impl.keystore, fns.keystore),
    storage: merge(impl.storage, fns.storage),
  }
  return impl
}

const merge = <T>(first: T, second: Partial<T> | undefined): T => {
  return {
    ...first,
    ...(second || {})
  }
}

export interface Dependencies {
  rsa: {
    verify: (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) => Promise<boolean>
  }
  ed25519: {
    verify: (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) => Promise<boolean>
  }
  keystore: {
    publicExchangeKey: () => Promise<string>
    publicWriteKey: () => Promise<string>
    decrypt: (encrypted: string) => Promise<string>
    sign: (message: string, charSize: number) => Promise<string>
    importSymmKey: (key: string, name: string) => Promise<void>
    exportSymmKey: (name: string) => Promise<string>
    keyExists: (keyName:string) => Promise<boolean>
    getAlg: () => Promise<string>
    clear: () => Promise<void>
  }
  storage: {
    getItem: <T>(key: string) => Promise<T | null>
    setItem: <T>(key: string, val: T) => Promise<T>
    removeItem: (key: string) => Promise<void>
    clear: () => Promise<void>
  }
}
