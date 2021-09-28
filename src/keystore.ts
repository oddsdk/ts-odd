import keystore from "keystore-idb"
import RSAKeyStore from "keystore-idb/lib/rsa/keystore.js"
import { CryptoSystem } from "keystore-idb/lib/types.js"

const KEYSTORE_CFG = { type: CryptoSystem.RSA }


let ks: RSAKeyStore | null = null


export const clear = async (): Promise<void> => {
  ks = await get()
  await ks.destroy()
  ks = null
}

export const create = async (): Promise<RSAKeyStore> => {
  return (await keystore.init(KEYSTORE_CFG)) as RSAKeyStore
}

export const set = async (userKeystore: RSAKeyStore): Promise<void> => {
  ks = userKeystore
}

export const get = async (): Promise<RSAKeyStore> => {
  if (ks) return ks
  ks = (await keystore.init(KEYSTORE_CFG)) as RSAKeyStore
  return ks
}
