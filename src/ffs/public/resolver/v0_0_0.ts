import { CID, FileContent } from '../../../ipfs'
import { Links, Metadata } from '../../types'
import operations from '../../operations'

export const getFile = async (cid: CID): Promise<FileContent> => {
  return operations.getFile(cid)
}

export const getLinks = async (cid: CID): Promise<Links> => {
  return operations.getLinks(cid)
}

export const getMetadata = async (_cid: CID): Promise<Partial<Metadata>> => {
  return { }
}

export const putFile = async (content: FileContent, _metadata: Partial<Metadata>): Promise<CID> => {
  return operations.putFile(content)
}

export const putTree = async (links: Links, _metadata: Partial<Metadata>): Promise<CID> => { 
  return operations.putLinks(links)
}

export default {
  getFile,
  getLinks,
  getMetadata,
  putFile,
  putTree
}
