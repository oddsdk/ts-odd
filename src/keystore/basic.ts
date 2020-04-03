import { getKeystore } from './config'

export const getKeyByName = async (keyName: string): Promise<string> => {
  const ks = await getKeystore()
  return ks.exportSymmKey(keyName)
}

export default {
  getKeyByName
}
