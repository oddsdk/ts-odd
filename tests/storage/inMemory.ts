// import localforage from 'localforage'
// import { assertBrowser } from '../common/browser'

// let storage: { [key: string]: any} = {}

export class Storage {
  storage: { [key: string]: any}

  constructor() {
      this.storage = {}
  }

  getItem = <T>(key: string): Promise<T | null> => {
    return new Promise(
      (resolve, reject) => {
        const val = this.storage[key] || null
        resolve(val)
      }
    )
  }
  
  setItem = <T>(key: string, val: T): Promise<T> => {
    return new Promise(
      (resolve, reject) => {
        this.storage[key] = val
        resolve(val)
      }
    )
  }
  
  removeItem = (key: string): Promise<void> => {
    return new Promise(
      (resolve, reject) => {
        delete this.storage[key]
        resolve()
      }
    )
  }
  
  clear = (): Promise<void> => {
    return new Promise(
      (resolve, reject) => {
        this.storage = {}
        resolve()
      }
    )
  }
}

// export const getItem = <T>(key: string): Promise<T | null> => {
//   return new Promise(
//     (resolve, reject) => {
//       const val = storage[key] || null
//       resolve(val)
//     }
//   )
// }

// export const setItem = <T>(key: string, val: T): Promise<T> => {
//   return new Promise(
//     (resolve, reject) => {
//       storage[key] = val
//       resolve(val)
//     }
//   )
// }

// export const removeItem = (key: string): Promise<void> => {
//   return new Promise(
//     (resolve, reject) => {
//       delete storage[key]
//       resolve()
//     }
//   )
// }

// export const clear = (): Promise<void> => {
//   return new Promise(
//     (resolve, reject) => {
//       storage = {}
//       resolve()
//     }
//   )
// }

