import { CID, FileContent } from '../../../ipfs'
import { isNum, isBool, isString, Maybe, mapObj } from '../../../common'
import semver from '../../semver'
import link from '../../link'
import { empty as emptyHeader } from '../../header'

import { Metadata, Header, TreeData, PrivateTreeData, CacheMap, NodeMap, Links, NodeInfo } from '../../types'
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

export const getCache = async (cid: CID, key: Maybe<string>): Promise<CacheMap> => {
  const cache = await header.getValue(cid, "cache", check.isCacheMap, key)
  return defaultError(cache, {})
}

export const getMetadata = async (cid: CID, key: Maybe<string>): Promise<Metadata> => {
  const links = await basic.getLinks(cid, key)
  const [name, isFile, mtime, size] = await Promise.all([
    header.getValue(links, 'name', isString, key),
    header.getValue(links, 'isFile', isBool, key),
    header.getValue(links, 'mtime', isNum, key),
    header.getValue(links, 'size', isNum, key)
  ])
  return {
    name: defaultError(name, ''),
    isFile: defaultError(isFile, false),
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
  headerVal: Header,
  key: Maybe<string>
): Promise<CID> => {
  const links = link.fromNodeMap(headerVal.cache)
  const index = await basic.putLinks(links, key)

  const size = Object.values(headerVal.cache || {})
              .reduce((acc, cur) => acc + cur.size, 0)

  return header.put(index, {
    ...headerVal,
    size,
    isFile: false,
    mtime: Date.now(),
    version: semver.encode(1, 0, 0),
  }, key)
}

export default {
  getFile,
  getTreeData,
  getMetadata,
  getCache,
  putFile,
  putTree
}
