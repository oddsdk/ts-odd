export type ImplementationOptions = {
  name: string
}

/**
 * Ephemeral storage.
 */
export type Implementation = {
  KEYS: {
    CABINET: string
    CID_LOG: string
  }

  getItem: <T>(key: string) => Promise<T | null>
  setItem: <T>(key: string, val: T) => Promise<T>
  removeItem: (key: string) => Promise<void>
  clear: () => Promise<void>
}
