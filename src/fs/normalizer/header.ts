import ipfs, { CID, FileContent, FileContentRaw } from '../../ipfs'
import { BasicLinks, Links, Header, Metadata, SemVer, PinMap } from '../types'
import basic from './basic'
import { isDecodingError, DecodingError, LinkDoesNotExistError, ContentTypeMismatchError } from './errors'
import { isString, mapObjAsync, notNull } from '../../common'
import link from '../link'
import semver from '../semver'
import { isSemVer } from '../types/check'

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

const removeUndefinedVals = <T>(obj: {[key: string]: T | undefined}): {[key: string]: T} => {
  return Object.entries(obj).reduce((acc, cur) => {
    const [key, val] = cur
    if(val !== undefined){
      acc[key] = val
    }
    return acc
  }, {} as {[key: string]: T})
}

export const put = async(index: CID, header: Header, key?: string): Promise<CID> => {
  const noUndefined = removeUndefinedVals(header)
  const linksArr = await Promise.all(
    Object.entries(noUndefined)
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
  const version = await getValue(cid, 'version', isSemVer, key)
  if(isDecodingError(version)){
    return semver.v0
  }
  return version
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
