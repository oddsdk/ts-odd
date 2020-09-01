import keystore from 'keystore-idb'
import { KeyStore, CryptoSystem } from 'keystore-idb/types'

const KEYSTORE_CFG = { type: CryptoSystem.RSA }


let ks: KeyStore | null = null


export const clear = async (): Promise<void> => {
  if (ks) {
    await keystore.clear()
    ks = null
  }
}

export const set = async (userKeystore: KeyStore): Promise<void> => {
  ks = userKeystore
}

export const get = async (): Promise<KeyStore> => {
  if (ks) return ks
  ks = await keystore.init(KEYSTORE_CFG)
  return ks
}
