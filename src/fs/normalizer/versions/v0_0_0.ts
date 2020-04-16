import { CID, FileContent } from '../../../ipfs'
import { TreeData, PrivateTreeData, Metadata, PinMap } from '../../types'
import basic from '../basic'

export const getFile = async (cid: CID, key?: string): Promise<FileContent> => {
  return basic.getFile(cid, key)
}

export const getTreeData = async (cid: CID, key?: string): Promise<TreeData | PrivateTreeData> => {
  if(key){
    return basic.getPrivateTreeData(cid, key)
  } else {
    const links = await basic.getLinks(cid, key)
    return { links }
  }
}

export const getMetadata = async (_cid: CID): Promise<Partial<Metadata>> => {
  return { }
}

export const getPins = async (cid: CID, key?: string): Promise<PinMap> => {
  return {}
}

export const putFile = async (content: FileContent, _metadata: Partial<Metadata>, key?: string): Promise<CID> => {
  return basic.putFile(content, key)
}

export const putTree = async (data: TreeData, _metadata: Partial<Metadata>, key?: string): Promise<CID> => { 
  return basic.putTree(data, key)
}

export default {
  getFile,
  getTreeData,
  getMetadata,
  getPins,
  putFile,
  putTree
}
