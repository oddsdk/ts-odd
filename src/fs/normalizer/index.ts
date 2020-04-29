import { CID, FileContent } from '../../ipfs'
import { Metadata, Header, SemVer, TreeData, PrivateTreeData, PinMap } from '../types'
import check from '../types/check'
import { getVersion } from './header'
import basic from './versions/v0_0_0'
import nested from './versions/v1_0_0'

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
  if (!check.isPrivateTreeData(data)) {
    throw new Error(`Not valid private tree node: ${cid}`)
  }
  return data
}

export const getMetadata = async (cid: CID, key?: string): Promise<Partial<Metadata>> => {
  const fns = await getAndSwitchVersion(cid, key)
  return fns.getMetadata(cid, key)
}

export const getPins = async (cid: CID, key: string): Promise<PinMap> => {
  const fns = await getAndSwitchVersion(cid, key)
  return fns.getPins(cid, key)
}

export const putFile = async (
  version: SemVer,
  content: FileContent,
  header: Partial<Header> = {},
  key?: string
): Promise<CID> => {
  const fns = switchVersion(version)
  return fns.putFile(content, header, key)
}

export const putTree = async (
  version: SemVer,
  data: TreeData,
  header: Partial<Header> = {},
  key?: string
): Promise<CID> => {
  const fns = switchVersion(version)
  return fns.putTree(data, header, key)
}

const getAndSwitchVersion = async (cid: CID, key?: string) => {
  const version = await getVersion(cid, key)
  return switchVersion(version)
}

const switchVersion = (version: SemVer) => {
  switch (version.major) {
    case 0:   return basic
    case 1:   return nested
    default:  return basic
  }
}

export default {
  getFile,
  getTreeData,
  getPrivateTreeData,
  getMetadata,
  getVersion,
  getPins,
  putFile,
  putTree
}
