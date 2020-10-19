import keystore from 'keystore-idb'
import RSAKeyStore from 'keystore-idb/rsa/keystore'
import { CryptoSystem } from 'keystore-idb/types'

const KEYSTORE_CFG = { type: CryptoSystem.RSA }


let ks: RSAKeyStore | null = null


export const clear = async (): Promise<void> => {
  if (ks) {
    await ks.destroy()
    ks = null
  }
}

export const set = async (userKeystore: RSAKeyStore): Promise<void> => {
  ks = userKeystore
}

export const get = async (): Promise<RSAKeyStore> => {
  if (ks) return ks
  ks = (await keystore.init(KEYSTORE_CFG)) as RSAKeyStore
  return ks
}
