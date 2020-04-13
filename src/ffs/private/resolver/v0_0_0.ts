import { CID, FileContent } from '../../../ipfs'
import { Metadata, PrivateTreeData } from '../../types'
import util from './util'

export const getFile = async (cid: CID, key: string): Promise<FileContent> => {
  return util.getDirectFile(cid, key)
}

export const getTree = async (cid: CID, key: string): Promise<PrivateTreeData> => {
  return util.getDirectTree(cid, key)
}

export const getMetadata = async (_cid: CID, _key: string): Promise<Partial<Metadata>> => {
  return { }
}

export const putFile = async (content: FileContent, key: string, _metadata: Partial<Metadata>): Promise<CID> => {
  return util.putDirectFile(content, key)
}

export const putTree = async (data: PrivateTreeData, key: string, _metadata: Partial<Metadata>): Promise<CID> => { 
  return util.putDirectTree(data, key)
}

export default {
  getFile,
  getTree,
  getMetadata,
  putFile,
  putTree
}
