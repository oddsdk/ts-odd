export interface CryptoAPIs {
  webcrypto: SubtleCrypto
  crypto: Crypto
}

let memoized: null | CryptoAPIs = null

export function getCrypto(): CryptoAPIs {
  if (memoized != null) return memoized

  const crypto: Crypto | undefined | null =
      // nodejs v15+
      (globalThis.crypto as any).webcrypto
      // browser
      || globalThis.crypto

  if (crypto == null || crypto.subtle == null) {
      throw new Error("Couldn't find access to the WebCrypto API on this platform.")
  }

  memoized = { webcrypto: crypto.subtle, crypto }
  return memoized
}
