import keystore from 'keystore-idb'
import { KeyStore, CryptoSystem } from 'keystore-idb/types'

const KEYSTORE_CFG = { type: CryptoSystem.RSA }

let ks: KeyStore | null = null

export const setKeystore = async (userKeystore: KeyStore): Promise<void> => {
  ks = userKeystore
}

export const getKeystore = async (): Promise<KeyStore> => {
  if(ks){
    return ks
  }
  ks = await keystore.init(KEYSTORE_CFG)
  return ks
}


export default {
  setKeystore,
  getKeystore,
}
