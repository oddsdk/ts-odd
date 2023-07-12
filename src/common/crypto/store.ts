export type Store = {
  getItem: (name: string) => Promise<CryptoKeyPair | CryptoKey | null>
  setItem: (name: string, key: CryptoKeyPair | CryptoKey) => Promise<unknown>
}