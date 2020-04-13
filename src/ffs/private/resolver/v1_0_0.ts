import ipfs, { CID, FileContent } from '../../../ipfs'
import { Metadata, FileSystemVersion, PrivateTreeData } from '../../types'
import link from '../../link'
import util from './util'
import { notNull } from '../../../common'

export const getFile = async (cid: CID, key: string): Promise<FileContent> => {
  console.log('getting file')
  const index = await util.getDirectLinkCID(cid, 'index', key)
  if(!index) {
    throw new Error("File does not exist")
  }
  return util.getDirectFile(index, key)
}

export const getTree = async (cid: CID, key: string): Promise<PrivateTreeData> => {
  console.log("getting tree")
  const index = await util.getDirectLinkCID(cid, 'index', key)
  if(!index) {
    throw new Error("Links do not exist")
  }
  const links = await util.getDirectLinksArr(index, key)
  console.log("links: ", links)
  const childKey = await getKey(cid, key)
  console.log("childKey: ", childKey)
  if(!childKey){
    throw new Error ("Could not retrieve key")
  }
  const withMetadata = await util.interpolateMetadata(links, (linkCID: CID) => getMetadata(linkCID, childKey))
  console.log("withMetadata: ", withMetadata)
  return { links: link.arrToMap(withMetadata), key: childKey } 
}

export const getKey = async (cid: CID, key: string): Promise<string | null> => {
  const keyCID = await util.getDirectLinkCID(cid, "key", key)
  if(!keyCID){
    return null
  }
  const childKey = await util.getDirectFile(keyCID, key)
  return typeof childKey === 'string' ? childKey : null
}

export const getMetadata = async (cid: CID, key: string): Promise<Metadata> => {
  console.log("getMetadata")
  const links = await util.getDirectLinks(cid, key)
  console.log("links: ", links)
  const [isFile, mtime] = await Promise.all([
    links['isFile']?.cid ? util.getEncryptedBool(links['isFile'].cid, key) : undefined,
    links['mtime']?.cid ? util.getEncryptedInt(links['mtime'].cid, key) : undefined
  ])
  return {
    isFile,
    mtime
  }
}

export const putWithMetadata = async(index: CID, key: string, metadata: Metadata & { key?: string }): Promise<CID> => {
  const withVersion = {
    ...metadata,
    version: FileSystemVersion.v1_0_0
  }
  const linksArr = await Promise.all(
    Object.entries(withVersion).map(async ([name, val]) => {
      if(val !== undefined){
        const cid = await util.putDirectFile(val, key)
        return { name, cid, isFile: true }
      }
      return null
    })
  )
  linksArr.push({ name: 'index', cid: index, isFile: false })
  const links = link.arrToMap(linksArr.filter(notNull))
  return util.putDirectLinks(links, key)
}

export const putFile = async (content: FileContent, key: string, metadata: Partial<Metadata>): Promise<CID> => {
  const index = await util.putDirectFile(content, key)
  return putWithMetadata(index, key, {
    ...metadata,
    isFile: true,
    mtime: Date.now()
  })
}

export const putTree = async(data: PrivateTreeData, key: string, metadata: Partial<Metadata>): Promise<CID> => {
  const index = await util.putDirectTree(data, key)
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
