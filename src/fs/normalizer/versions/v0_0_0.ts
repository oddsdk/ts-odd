import { CID, FileContent } from '../../../ipfs'
import { TreeData, PrivateTreeData, Metadata, PinMap, CacheMap } from '../../types'
import { Maybe, isJust } from '../../../common'

import basic from '../basic'


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
    size: 0
  }
}

export const getPins = async (_cid: CID, _key: Maybe<string>): Promise<PinMap> => {
  return {}
}

export const getCache = async (_cid: CID, _key: Maybe<string>): Promise<CacheMap> => {
  return {}
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
  data: TreeData,
  _metadata: Partial<Metadata>,
  key: Maybe<string>
): Promise<CID> => {
  return basic.putTree(data, key)
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
