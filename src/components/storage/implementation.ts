export type ImplementationOptions = {
  name: string
}


export type Implementation = {
  KEYS: {
    ACCOUNT_UCAN: string
    CID_LOG: string
    UCANS: string
    SESSION: string
  }

  getItem: <T>(key: string) => Promise<T | null>
  setItem: <T>(key: string, val: T) => Promise<T>
  removeItem: (key: string) => Promise<void>
  clear: () => Promise<void>
}
