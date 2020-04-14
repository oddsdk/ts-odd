import { CID, FileContent } from '../../../ipfs'
import { Metadata, PrivateTreeData } from '../../types'
import operations from '../../operations'

export const getFile = async (cid: CID, key: string): Promise<FileContent> => {
  return operations.getFile(cid, key)
}

export const getTree = async (cid: CID, key: string): Promise<PrivateTreeData> => {
  const data = await operations.getPrivateTreeData(cid, key)
  if(!data) {
    throw new Error(`Links do not exist: ${cid}`)
  }
  return data
}

export const getMetadata = async (_cid: CID, _key: string): Promise<Partial<Metadata>> => {
  return { }
}

export const putFile = async (content: FileContent, key: string, _metadata: Partial<Metadata>): Promise<CID> => {
  return operations.putFile(content, key)
}

export const putTree = async (data: PrivateTreeData, key: string, _metadata: Partial<Metadata>): Promise<CID> => { 
  return operations.putTree(data, key)
}

export default {
  getFile,
  getTree,
  getMetadata,
  putFile,
  putTree
}
