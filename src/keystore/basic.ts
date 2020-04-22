import { getKeystore } from './config'
import keystore from 'keystore-idb'

export const clear = (): Promise<void> => {
  return keystore.clear()
}

export const getKeyByName = async (keyName: string): Promise<string> => {
  const ks = await getKeystore()
  return ks.exportSymmKey(keyName)
}

export default {
  clear,
  getKeyByName
}
