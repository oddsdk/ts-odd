import { CID, FileContent } from '../../../ipfs'
import { TreeData, PrivateTreeData, Metadata, CacheMap, Header } from '../../types'
import { Maybe, isJust, mapObj } from '../../../common'
import semver from '../../semver'
import header from '../../header'

import basic from '../basic'
import { isPrivateTreeData } from '../../types/check'
import link from '../../link'


export const getFile = async (cid: CID, key: Maybe<string>): Promise<FileContent> => {
  return basic.getFile(cid, key)
}

export const getTreeData = async (cid: CID, key: Maybe<string>): Promise<TreeData | PrivateTreeData> => {
  if (isJust(key)) {
    return basic.getPrivateTreeData(cid, key)
  } else {
    const links = await basic.getLinks(cid, key)
    return { links }
  }
}

export const getMetadata = async (_cid: CID): Promise<Metadata> => {
  return {
    name: '', // TODO fix this
    size: 0,
    isFile: false // and this
  }
}

export const getCache = async (cid: CID, parentKey: Maybe<string>): Promise<CacheMap> => {
  const data = await getTreeData(cid, parentKey)
  return mapObj(data.links, (val, _key) => {
    const { name, cid, size, mtime, isFile } = val
    return {
      ...header.empty(),
      name,
      cid,
      version: semver.v0,
      key: isPrivateTreeData(data) ? data.key : null,
      isFile,
      mtime,
      size: size || 0
    }
  })
}

export const putFile = async (
  content: FileContent,
  _metadata: Partial<Metadata>,
  key: Maybe<string>
): Promise<CID> => {
  const { cid } = await basic.putFile(content, key)
  return cid
}

export const putTree = async (
  headerVal: Header,
  parentKey: Maybe<string>
): Promise<CID> => {
  const { cache, key } = headerVal
  const links = link.fromNodeMap(cache)
  const data = { links, key}
  return basic.putTree(data, parentKey)
}

export default {
  getFile,
  getTreeData,
  getMetadata,
  getCache,
  putFile,
  putTree
}
