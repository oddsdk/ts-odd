import { CID, FileContent } from '../../../ipfs'
import { Links, Metadata, FileSystemVersion } from '../../types'
import v0_0_0 from './v0_0_0'
import v1_0_0 from './v1_0_0'
import util from './util'

export const getFile = async (cid: CID): Promise<FileContent> => {
  const version = await util.getVersion(cid)
  const fns = switchVersion(version)
  return fns.getFile(cid)
}

export const getLinks = async (cid: CID): Promise<Links> => {
  const version = await util.getVersion(cid)
  const fns = switchVersion(version)
  return fns.getLinks(cid)
}

export const getMetadata = async (cid: CID): Promise<Partial<Metadata>> => {
  const version = await util.getVersion(cid)
  const fns = switchVersion(version)
  return fns.getMetadata(cid)
}

export const getVersion = async(cid: CID): Promise<FileSystemVersion> => {
  return util.getVersion(cid)
}

export const putFile = async (version: FileSystemVersion, content: FileContent, metadata: Partial<Metadata> = {}): Promise<CID> => {
  const fns = switchVersion(version)
  return fns.putFile(content, metadata)
}

export const putTree = async(version: FileSystemVersion, links: Links, metadata: Partial<Metadata> = {}): Promise<CID> => {
  const fns = switchVersion(version)
  return fns.putTree(links, metadata)
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
  getLinks,
  getMetadata,
  getVersion,
  putFile,
  putTree
}
