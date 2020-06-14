import keystore from 'keystore-idb'

import { CryptoSystem } from 'keystore-idb/types'
import { RSAKeyStore } from 'keystore-idb/rsa'
import rsakeystore from 'keystore-idb/rsa/keystore'

const KEYSTORE_CFG = { type: CryptoSystem.RSA }

let ks: RSAKeyStore | null = null

export const clear = async (): Promise<void> => {
  if (ks) {
    await keystore.clear()
    ks = null
  }
}

export const set = async (userKeystore: RSAKeyStore): Promise<void> => {
  ks = userKeystore
}

export const get = async (): Promise<RSAKeyStore> => {
  if (ks) return ks
  ks = (await rsakeystore.init(KEYSTORE_CFG)) as RSAKeyStore
  return ks
}
