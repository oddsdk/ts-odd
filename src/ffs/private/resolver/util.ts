import ipfs, { CID, FileContent } from '../../../ipfs'
import { Links, Metadata, FileSystemVersion, PrivateTreeData } from '../../types'
import link from '../../link'
import util from '../util'

export const getFile = async (cid: CID, key: string): Promise<FileContent> => {
  const encrypted = await ipfs.catBuf(cid)
  return await util.decryptContent(encrypted, key)
}

export const getTree = async (cid: CID, key: string): Promise<PrivateTreeData> => {
  const content = await ipfs.catBuf(cid)
  return util.decryptNode(content, key)
}

export const getLinkCID = async(cid: CID, name: string, key: string): Promise<CID | null> => {
  const { links } = await getTree(cid, key)
  return links[name]?.cid || null
}

export const putFile = async (content: FileContent, key: string): Promise<CID> => {
  const encrypted = await util.encryptContent(content, key)
  return ipfs.add(encrypted)
}

export const putTree = async (data: PrivateTreeData, key: string): Promise<CID> => { 
  const encrypted = await util.encryptNode(data, key)
  return ipfs.add(encrypted)
}

export const getVersion = async(cid: CID, key: string): Promise<FileSystemVersion> => {
  const versionCID = await getLinkCID(cid, "version", key)
  if(!versionCID){
    return FileSystemVersion.v0_0_0
  }
  const versionStr = await ipfs.cat(versionCID)
  switch(versionStr) {
    case "1.0.0": 
      return FileSystemVersion.v1_0_0
    default: 
      return FileSystemVersion.v0_0_0
  }
}

export default {
  getFile,
  getTree,
  getLinkCID,
  putFile,
  putTree,
  getVersion,
}
