import keystore from 'keystore-idb'
import { KeyStore, CryptoSystem } from 'keystore-idb/types'

const KEYSTORE_CFG = { type: CryptoSystem.RSA }

let ks: KeyStore | null = null

export async function get(): Promise<KeyStore> {
  if(ks){
    return ks
  }
  ks = await keystore.init(KEYSTORE_CFG)
  return ks
}

export default {
  get
}
