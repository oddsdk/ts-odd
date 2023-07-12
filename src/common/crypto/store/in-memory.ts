import { Store } from "../store.js"


export function create(): Store {
  const cache: Record<string, CryptoKeyPair | CryptoKey> = {}

  return {
    getItem: async (name: string) => cache[ name ],
    setItem: async (name: string, key: CryptoKeyPair | CryptoKey) => cache[ name ] = key
  }
}