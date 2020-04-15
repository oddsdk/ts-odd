import ipfs, { CID } from '../../ipfs'
import { Links, FileSystemVersion, Header } from '../types'
import basic from './basic'
import { notNull, isString } from '../../common'
import link from '../link'

export const getValue = async <T>(linksOrCID: Links | CID, name: string, checkFn: (obj: any) => obj is T, key?: string): Promise<T | null> => {
  if(typeof linksOrCID === "string") {
    const links = await basic.getLinks(linksOrCID, key)
    return getValueFromLinks(links, name, checkFn, key)
  }
  return getValueFromLinks(linksOrCID, name, checkFn, key)
}

export const getValueFromLinks = async <T>(links: Links, name: string, checkFn: (obj: any) => obj is T, key?: string): Promise<T | null> => {
  const linkCID = links[name]?.cid
  const value = linkCID ? await basic.getFile(linkCID, key) : null
  return checkFn(value) ? value : null
}

export const getChildKey = async (cid: CID, key: string): Promise<string> => {
  const childKey = await getValue(cid, "key", isString, key)
  if(childKey === null){
    throw new Error(`Could not retrieve child key: ${cid}`)
  }
  return childKey
}

export const put = async(index: CID, header: Header, key?: string): Promise<CID> => {
  const withVersion = {
    ...header,
    version: FileSystemVersion.v1_0_0
  }
  const linksArr = await Promise.all(
    Object.entries(withVersion).map(async ([name, val]) => {
      if(val !== undefined){
        const cid = await ipfs.encoded.add(val, key)
        return { name, cid, isFile: true }
      }
      return null
    })
  )
  linksArr.push({ name: 'index', cid: index, isFile: false })
  const links = link.arrToMap(linksArr.filter(notNull))
  return basic.putLinks(links, key)
}

export default {
  getValue,
  getValueFromLinks,
  getChildKey,
  put
}
