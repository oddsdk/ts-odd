import ipfs, { CID, FileContent } from '../../ipfs'
import { Links, Metadata, FileSystemVersion, Header, TreeData, PrivateTreeData } from '../types'
import util from './util'
import { notNull } from '../../common'
import link from '../link'

export const getFile = async (cid: CID, key?: string): Promise<FileContent> => {
  const indexCID = await util.getLinkCID(cid, 'index', key)
  if(!indexCID) {
    throw new Error("File does not exist")
  }
  return util.getFile(indexCID, key)
}

export const getTreeData = async (cid: CID, key?: string): Promise<TreeData | PrivateTreeData> => {
  const indexCID = await util.getLinkCID(cid, 'index', key)
  if(!indexCID) {
    throw new Error(`Links do not exist: ${indexCID}`)
  }
  const links = await util.getLinks(indexCID, key)
  const childKey = key ? await getChildKey(cid, key) : undefined
  const withMetadata = await util.interpolateMetadata(links, 
    (linkCID: CID) => getMetadata(linkCID, childKey)
  )
  return { links: withMetadata, key: childKey }
}

export const getChildKey = async (cid: CID, key: string): Promise<string> => {
  const keyCID = await util.getLinkCID(cid, "key", key)
  console.log('keyCID: ', keyCID)
  const childKey = keyCID ? await util.getFile(keyCID, key) : undefined
  console.log('childKey: ', childKey)
  if(typeof childKey !== 'string'){
    throw new Error (`Could not retrieve child key: ${cid}`)
  }
  return childKey
}

export const getMetadata = async (cid: CID, key?: string): Promise<Metadata> => {
  const links = await util.getLinks(cid)
  const [isFile, mtime] = await Promise.all([
    links['isFile']?.cid ? ipfs.encoded.getBool(links['isFile'].cid, key) : undefined,
    links['mtime']?.cid ? ipfs.encoded.getInt(links['mtime'].cid, key) : undefined
  ])
  return {
    isFile,
    mtime
  }
}

export const putWithMetadata = async(index: CID, header: Header, key?: string): Promise<CID> => {
  const withVersion = {
    ...header,
    version: FileSystemVersion.v1_0_0
  }
  const linksArr = await Promise.all(
    Object.entries(withVersion).map(async ([name, val]) => {
      if(val !== undefined){
        const cid = await ipfs.encoded.add(val, key)
        return { name, cid, isFile: true }
      }
      return null
    })
  )
  linksArr.push({ name: 'index', cid: index, isFile: false })
  const links = link.arrToMap(linksArr.filter(notNull))
  return util.putLinks(links, key)
}

export const putFile = async (content: FileContent, metadata: Partial<Metadata>, key?: string): Promise<CID> => {
  const index = await util.putFile(content, key)
  return putWithMetadata(index, {
    ...metadata,
    isFile: true,
    mtime: Date.now(),
  }, key)
}

export const putTree = async(data: TreeData | PrivateTreeData, metadata: Partial<Metadata>, key?: string): Promise<CID> => {
  const index = await util.putLinks(data.links, key)
  const childKey = util.isPrivateTreeData(data) ? data.key : undefined
  return putWithMetadata(index, {
    ...metadata,
    isFile: false,
    mtime: Date.now(),
    key: childKey
  }, key)
}

export default {
  getFile,
  getTreeData,
  getMetadata,
  putFile,
  putTree
}
