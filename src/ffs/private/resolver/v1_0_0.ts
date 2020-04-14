import ipfs, { CID, FileContent } from '../../../ipfs'
import { Metadata, FileSystemVersion, PrivateTreeData, Header } from '../../types'
import link from '../../link'
import operations from '../../operations'
import { notNull } from '../../../common'

export const getFile = async (cid: CID, key: string): Promise<FileContent> => {
  const index = await operations.getLinkCID(cid, 'index', key)
  if(!index) {
    throw new Error("File does not exist")
  }
  return operations.getFile(index, key)
}

export const getTree = async (cid: CID, key: string): Promise<PrivateTreeData> => {
  const index = await operations.getLinkCID(cid, 'index', key)
  if(!index) {
    throw new Error("Links do not exist")
  }
  const links = await operations.getLinks(index, key)
  const childKey = await getKey(cid, key)
  if(!childKey){
    throw new Error ("Could not retrieve key")
  }
  const withMetadata = await operations.interpolateMetadata(links, (linkCID: CID) => getMetadata(linkCID, childKey))
  return { links: withMetadata, key: childKey } 
}

export const getKey = async (cid: CID, key: string): Promise<string | null> => {
  const keyCID = await operations.getLinkCID(cid, "key", key)
  if(!keyCID){
    return null
  }
  const childKey = await operations.getFile(keyCID, key)
  return typeof childKey === 'string' ? childKey : null
}

export const getMetadata = async (cid: CID, key: string): Promise<Metadata> => {
  const links = await operations.getLinks(cid, key)
  const [isFile, mtime] = await Promise.all([
    links['isFile']?.cid ? ipfs.encoded.getBool(links['isFile'].cid, key) : undefined,
    links['mtime']?.cid ? ipfs.encoded.getInt(links['mtime'].cid, key) : undefined
  ])
  return {
    isFile,
    mtime
  }
}

export const putWithMetadata = async(index: CID, key: string, header: Header): Promise<CID> => {
  const withVersion = {
    ...header,
    version: FileSystemVersion.v1_0_0
  }
  const linksArr = await Promise.all(
    Object.entries(withVersion).map(async ([name, val]) => {
      if(val !== undefined){
        const cid = await operations.putFile(val, key)
        return { name, cid, isFile: true }
      }
      return null
    })
  )
  linksArr.push({ name: 'index', cid: index, isFile: false })
  const links = link.arrToMap(linksArr.filter(notNull))
  return operations.putLinks(links, key)
}

export const putFile = async (content: FileContent, key: string, metadata: Partial<Metadata>): Promise<CID> => {
  const index = await operations.putFile(content, key)
  return putWithMetadata(index, key, {
    ...metadata,
    isFile: true,
    mtime: Date.now()
  })
}

export const putTree = async(data: PrivateTreeData, key: string, metadata: Partial<Metadata>): Promise<CID> => {
  const index = await operations.putTree(data, key)
  return putWithMetadata(index, key, {
    ...metadata,
    key: data.key,
    isFile: false,
    mtime: Date.now()
  })
}

export default {
  getFile,
  getTree,
  getMetadata,
  putFile,
  putTree
}
