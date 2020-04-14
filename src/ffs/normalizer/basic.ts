import { CID, FileContent } from '../../ipfs'
import { TreeData, PrivateTreeData, Metadata} from '../types'
import util from './util'

export const getFile = async (cid: CID, key?: string): Promise<FileContent> => {
  return util.getFile(cid, key)
}

export const getTreeData = async (cid: CID, key?: string): Promise<TreeData | PrivateTreeData> => {
  if(key){
    return util.getPrivateTreeData(cid, key)
  } else {
    const links = await util.getLinks(cid, key)
    return { links }
  }
}

export const getMetadata = async (_cid: CID): Promise<Partial<Metadata>> => {
  return { }
}

export const putFile = async (content: FileContent, _metadata: Partial<Metadata>, key?: string): Promise<CID> => {
  return util.putFile(content, key)
}

export const putTree = async (data: TreeData, _metadata: Partial<Metadata>, key?: string): Promise<CID> => { 
  return util.putTree(data, key)
}

export default {
  getFile,
  getTreeData,
  getMetadata,
  putFile,
  putTree
}
