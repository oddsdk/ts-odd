import { Links, PinMap } from "./types"
import { isCID } from "./types/check"
import link from "./link"
import * as path from "./path"
import { sha256Str } from "../common/crypto"

export const pinMapToLinks = async (curPath: string, pins: PinMap, salt: string): Promise<Links> => {
  let links = {} as Links
  const entries = Object.entries(pins)
  for(let i=0; i<entries.length; i++){
    const [key, val] = entries[i]
    if(isCID(val)){
      const name = await sha256Str(
        path.joinNoSuffix([curPath, key]) + salt
      )
      links[name] = link.make(name, val, false)
    } else {
      const childLinks = await pinMapToLinks(path.joinNoSuffix([curPath, key]), val, salt)
      links = {
        ...links,
        ...childLinks
      }
    }
  }
  return links
}
