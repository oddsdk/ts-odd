export type Implementation = {
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
}
