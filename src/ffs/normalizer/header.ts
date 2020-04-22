import ipfs, { CID } from '../../ipfs'
import { BasicLinks, Links, Header, Metadata, SemVer } from '../types'
import basic from './basic'
import { isDecodingError, DecodingError, LinkDoesNotExistError, ContentTypeMismatchError } from './errors'
import { isString, mapObjAsync } from '../../common'
import link from '../link'
import semver from '../semver'

export const getValue = async <T>(linksOrCID: Links | CID, name: string, checkFn: (obj: any) => obj is T, key?: string): Promise<T | DecodingError> => {
  if(typeof linksOrCID === "string") {
    const links = await basic.getLinks(linksOrCID, key)
    return getValueFromLinks(links, name, checkFn, key)
  }
  return getValueFromLinks(linksOrCID, name, checkFn, key)
}

export const getValueFromLinks = async <T>(links: Links, name: string, checkFn: (obj: any) => obj is T, key?: string): Promise<T | DecodingError> => {
  const linkCID = links[name]?.cid
  if(!linkCID) {
    return new LinkDoesNotExistError(name)
  }
  const value = await ipfs.encoded.catAndDecode(linkCID, key)
  return checkFn(value) ? value : new ContentTypeMismatchError(linkCID)
}

export const getChildKey = async (cid: CID, key: string): Promise<string> => {
  const childKey = await getValue(cid, "key", isString, key)
  if(isDecodingError(childKey)){
    throw new Error(`Could not retrieve child key: ${cid}. ${childKey.toString()}`)
  }
  return childKey
}

export const put = async(index: CID, header: Header, key?: string): Promise<CID> => {
  const withVersion = {
    ...header,
    version: semver.encode(1, 0, 0)
  }
  const linksArr = await Promise.all(
    Object.entries(withVersion)
      .filter(([_name, val]) => val !== undefined)
      .map(async ([name, val]) => {
        const cid = await ipfs.encoded.add(val, key)
        return { name, cid, isFile: true }
      })
  )
  linksArr.push({ name: 'index', cid: index, isFile: false })
  const links = link.arrToMap(linksArr)
  return basic.putLinks(links, key)
}

export const getVersion = async(cid: CID, key?: string): Promise<SemVer> => {
  const version = await getValue(cid, 'version', isString, key)
  if(isDecodingError(version)){
    return semver.v0
  }
  return semver.fromString(version) || semver.v0
}

export const interpolateMetadata = async (
  links: BasicLinks,
  getMetadata: (cid: CID) => Promise<Metadata>
): Promise<Links> => {
  return mapObjAsync(links, async (link) => {
    const { isFile = false, mtime } = await getMetadata(link.cid)
    return {
      ...link,
      isFile,
      mtime
    }
  })
}

export default {
  getValue,
  getValueFromLinks,
  getChildKey,
  put,
  getVersion, 
  interpolateMetadata,
}
