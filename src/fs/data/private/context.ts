export interface EncryptionContext {
  webcrypto: SubtleCrypto
  crypto: Crypto
}

export function getCrypto(): EncryptionContext {
  const crypto: Crypto | undefined | null =
      // nodejs v15+
      (globalThis.crypto as any).webcrypto
      // browser
      || globalThis.crypto

  if (crypto == null || crypto.subtle == null) {
      throw new Error("Couldn't find access to the WebCrypto API on this platform.")
  }

  return { webcrypto: crypto.subtle, crypto }
}
