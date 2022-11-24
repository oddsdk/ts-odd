/**
 * In memory storage.
 * This in memory storage implements the methods of localForage.
 */
export class Storage {
  storage: { [key: string]: any}

  constructor() {
    this.storage = {}
  }

  getItem = <T>(key: string): Promise<T | null> => {
    return new Promise(resolve => {
      const val = this.storage[key] || null

      // https://localforage.github.io/localForage/#data-api-getitem
      // "Even if undefined is saved, null will be returned by getItem().
      // This is due to a limitation in localStorage, and for compatibility
      // reasons localForage cannot store the value undefined."
      const checkedVal = val === undefined ? null : val

      resolve(checkedVal)
    })
  }

  setItem = <T>(key: string, val: T): Promise<T> => {
    return new Promise(resolve => {
      this.storage[key] = val
      resolve(val)
    })
  }

  removeItem = (key: string): Promise<void> => {
    return new Promise(resolve => {
      delete this.storage[key]
      resolve()
    })
  }

  clear = (): Promise<void> => {
    return new Promise(resolve => {
      this.storage = {}
      resolve()
    })
  }
}