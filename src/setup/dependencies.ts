import * as browserCrypto from "../crypto/browser.js"
import * as browserStorage from "../storage/browser.js"
import * as authLobby from "../auth/lobby.js"
import { InitOptions, State } from "../index.js"

import type { Channel, ChannelOptions } from "../auth/channel"

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
  },
  auth: {
    init: authLobby.init,
    register: authLobby.register,
    isUsernameValid: authLobby.isUsernameValid,
    isUsernameAvailable: authLobby.isUsernameAvailable,
    createChannel: authLobby.createChannel,
    checkCapability: authLobby.checkCapability,
    delegateAccount: authLobby.delegateAccount,
    linkDevice: authLobby.linkDevice,
  },
}

export let impl: Dependencies = DEFAULT_IMPLEMENTATION

export const setDependencies = (fns: Partial<Dependencies>): Dependencies => {
  impl = {
    rsa: merge(impl.rsa, fns.rsa),
    ed25519: merge(impl.ed25519, fns.ed25519),
    keystore: merge(impl.keystore, fns.keystore),
    storage: merge(impl.storage, fns.storage),
    auth: merge(impl.auth, fns.auth),
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
    keyExists: (keyName: string) => Promise<boolean>
    getAlg: () => Promise<string>
    clear: () => Promise<void>
  }
  storage: {
    getItem: <T>(key: string) => Promise<T | null>
    setItem: <T>(key: string, val: T) => Promise<T>
    removeItem: (key: string) => Promise<void>
    clear: () => Promise<void>
  }
  auth: {
    init: (options: InitOptions) => Promise<State | null>
    register: (options: { email: string; username: string }) => Promise<{ success: boolean }>
    isUsernameValid: (username: string) => Promise<boolean>
    isUsernameAvailable: (username: string) => Promise<boolean>
    createChannel: (options: ChannelOptions) => Promise<Channel>
    checkCapability: (username: string) => Promise<boolean>
    delegateAccount: (audience: string) => Promise<Record<string, unknown>>
    linkDevice: (data: Record<string, unknown>) => Promise<void>
  }
}
