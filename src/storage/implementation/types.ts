export type Implementation = {
  getItem: <T>(key: string) => Promise<T | null>
  setItem: <T>(key: string, val: T) => Promise<T>
  removeItem: (key: string) => Promise<void>
  clear: () => Promise<void>
}
