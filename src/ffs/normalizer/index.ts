import { CID, FileContent } from '../../ipfs'
import { Metadata, FileSystemVersion, TreeData, PrivateTreeData } from '../types'
import { getVersion, isPrivateTreeData } from './util'
import basic from './basic'
import nested from './nested'

export const getFile = async (cid: CID, key?: string): Promise<FileContent> => {
  const fns = await getAndSwitchVersion(cid, key)
  return fns.getFile(cid, key)
}

export const getTreeData = async (cid: CID, key?: string): Promise<TreeData> => {
  const fns = await getAndSwitchVersion(cid, key)
  return fns.getTreeData(cid, key)
}

export const getPrivateTreeData = async (cid: CID, key: string): Promise<PrivateTreeData> => {
  const data = await getTreeData(cid, key)
  if(!isPrivateTreeData(data)) {
    throw new Error(`Not valid private tree node: ${cid}`)
  }
  return data
}

export const getMetadata = async (cid: CID, key?: string): Promise<Partial<Metadata>> => {
  const fns = await getAndSwitchVersion(cid, key)
  return fns.getMetadata(cid)
}

export const putFile = async (version: FileSystemVersion, content: FileContent, metadata: Partial<Metadata> = {}, key?: string): Promise<CID> => {
  const fns = switchVersion(version)
  return fns.putFile(content, metadata, key)
}

export const putTree = async(version: FileSystemVersion, data: TreeData, metadata: Partial<Metadata> = {}, key?: string): Promise<CID> => {
  const fns = switchVersion(version)
  return fns.putTree(data, metadata, key)
}

const getAndSwitchVersion = async (cid: CID, key?: string) => {
  const version = await getVersion(cid, key)
  return switchVersion(version)
}

const switchVersion = (version: FileSystemVersion) => {
  switch(version) {
    case FileSystemVersion.v0_0_0:
      return basic
    case FileSystemVersion.v1_0_0:
      return nested
  }
}

export default {
  getFile,
  getTreeData,
  getPrivateTreeData,
  getMetadata,
  getVersion,
  putFile,
  putTree
}
