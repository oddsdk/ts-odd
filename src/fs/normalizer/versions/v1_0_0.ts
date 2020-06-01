import { CID, FileContent } from '../../../ipfs'
import { isNum, isBool, isString, Maybe } from '../../../common'
import semver from '../../semver'
import { empty as emptyHeader } from '../../header'

import { Metadata, Header, TreeData, PrivateTreeData, PinMap, CacheMap } from '../../types'
import check from '../../types/check'

// Normalization

import basic from '../basic'
import header from '../header'
import { defaultError } from '../errors'


export const getFile = async (cid: CID, key: Maybe<string>): Promise<FileContent> => {
  const indexCID = await basic.getLinkCID(cid, 'index', key)
  if (!indexCID) {
    throw new Error("File does not exist")
  }
  return basic.getFile(indexCID, key)
}

export const getTreeData = async (cid: CID, key: Maybe<string>): Promise<TreeData | PrivateTreeData> => {
  const indexCID = await basic.getLinkCID(cid, 'index', key)
  if (!indexCID) throw new Error(`Links do not exist: ${indexCID}`)

  const links = await basic.getLinks(indexCID, key)
  const keyOrErr = await header.getValue(cid, 'key', isString, key)
  const childKey = defaultError(keyOrErr, null)
  const withMetadata = await header.interpolateMetadata(links,
    (linkCID: CID) => getMetadata(linkCID, childKey)
  )

  return { 
    links: withMetadata,
    key: childKey || undefined
  }
}

export const getPins = async (cid: CID, key: string): Promise<PinMap> => {
  const pins = await header.getValue(cid, "pins", check.isPinMap, key)
  return defaultError(pins, {})
}

export const getCache = async (cid: CID, key: Maybe<string>): Promise<CacheMap> => {
  const cache = await header.getValue(cid, "cache", check.isCacheMap, key)
  return defaultError(cache, {})
}

export const getMetadata = async (cid: CID, key: Maybe<string>): Promise<Metadata> => {
  const links = await basic.getLinks(cid, key)
  const [isFile, mtime, size] = await Promise.all([
    header.getValue(links, 'isFile', isBool, key),
    header.getValue(links, 'mtime', isNum, key),
    header.getValue(links, 'size', isNum, key)
  ])
  return {
    isFile: defaultError(isFile, undefined),
    mtime: defaultError(mtime, undefined),
    size: defaultError(size, 0),
  }
}

export const putFile = async (
  content: FileContent,
  headerVal: Partial<Header>,
  key: Maybe<string>
): Promise<CID> => {
  const { cid, size } = await basic.putFile(content, key)
  return header.put(cid, {
    ...emptyHeader(),
    ...headerVal,
    size,
    isFile: true,
    mtime: Date.now(),
    version: semver.encode(1, 0, 0)
  }, key)
}

export const putTree = async (
  data: TreeData | PrivateTreeData,
  headerVal: Partial<Header>,
  key: Maybe<string>
): Promise<CID> => {
  const index = await basic.putLinks(data.links, key)
  const childKey = check.isPrivateTreeData(data) ? data.key : null
  const size = Object.values(headerVal.cache || {})
              .reduce((acc, cur) => acc + cur.size, 0)

  return header.put(index, {
    ...emptyHeader(),
    ...headerVal,
    size,
    isFile: false,
    mtime: Date.now(),
    version: semver.encode(1, 0, 0),
    key: childKey
  }, key)
}

export default {
  getFile,
  getTreeData,
  getMetadata,
  getPins,
  getCache,
  putFile,
  putTree
}
