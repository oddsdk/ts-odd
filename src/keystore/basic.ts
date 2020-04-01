import { getKeystore } from './config'

export async function getKeyByName(keyName: string) {
  const ks = await getKeystore()
  return ks.exportSymmKey(keyName)
}

export default {
  getKeyByName
}
