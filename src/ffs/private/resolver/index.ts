import { CID, FileContent } from '../../../ipfs'
import { Metadata, FileSystemVersion, PrivateTreeData } from '../../types'
import v0_0_0 from './v0_0_0'
import v1_0_0 from './v1_0_0'
import util from './util'

export const getFile = async (cid: CID, key: string): Promise<FileContent> => {
  const version = await util.getVersion(cid, key)
  const fns = switchVersion(version)
  return fns.getFile(cid, key)
}

export const getTree = async (cid: CID, key: string): Promise<PrivateTreeData> => {
  const version = await util.getVersion(cid, key)
  const fns = switchVersion(version)
  return fns.getTree(cid, key)
}

export const getMetadata = async (cid: CID, key: string): Promise<Partial<Metadata>> => {
  const version = await util.getVersion(cid, key)
  const fns = switchVersion(version)
  return fns.getMetadata(cid, key)
}

export const getVersion = async(cid: CID, key: string): Promise<FileSystemVersion> => {
  return util.getVersion(cid, key)
}

export const putFile = async (version: FileSystemVersion, content: FileContent, key: string, metadata: Partial<Metadata> = {}): Promise<CID> => {
  const fns = switchVersion(version)
  return fns.putFile(content, key, metadata)
}

export const putTree = async(version: FileSystemVersion, data: PrivateTreeData, key: string, metadata: Partial<Metadata> = {}): Promise<CID> => {
  const fns = switchVersion(version)
  return fns.putTree(data, key, metadata)
}

const switchVersion = (version: FileSystemVersion) => {
  switch(version) {
    case FileSystemVersion.v0_0_0:
      return v0_0_0
    case FileSystemVersion.v1_0_0:
      return v1_0_0
  }
}

export default {
  getFile,
  getTree,
  getMetadata,
  getVersion,
  putFile,
  putTree
}
