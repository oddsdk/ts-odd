import cbor from 'borc'
import ipfs, { CID, FileContent } from '../../../ipfs'
import { Metadata, FileSystemVersion, PrivateTreeData } from '../../types'
import link from '../../link'
import util from './util'
import { notNull } from '../../../common'

export const getFile = async (cid: CID, key: string): Promise<FileContent> => {
  console.log("HERE: ")
  const index = await util.getLinkCID(cid, 'index', key)
  if(!index) {
    throw new Error("File does not exist")
  }
  return util.getFile(index, key)
}

export const getTree = async (cid: CID, key: string): Promise<PrivateTreeData> => {
  console.log("GET TREE")
  const index = await util.getLinkCID(cid, 'index', key)
  if(!index) {
    throw new Error("Links do not exist")
  }
  const links = await util.getLinksArr(index, key)
  const withMetadata = await util.interpolateMetadata(links, (linkCID: CID) => getMetadata(linkCID, key))
  return { links: link.arrToMap(withMetadata), key } 
}

export const getMetadata = async (cid: CID, key: string): Promise<Metadata> => {
  const { links } = await util.getTree(cid, key)
  const [isFile, mtime] = await Promise.all([
    links['isFile']?.cid ? ipfs.encoded.getBool(links['isFile'].cid) : undefined,
    links['mtime']?.cid ? ipfs.encoded.getInt(links['mtime'].cid) : undefined
  ])
  return {
    isFile,
    mtime
  }
}

export const putWithMetadata = async(index: CID, key: string, metadata: Metadata): Promise<CID> => {
  const withVersion = {
    ...metadata,
    version: FileSystemVersion.v1_0_0
  }
  const linksArr = await Promise.all(
    Object.entries(withVersion).map(async ([name, val]) => {
      if(val !== undefined){
        const cid = await util.putFile(val, key)
        return { name, cid, isFile: true }
      }
      return null
    })
  )
  linksArr.push({ name: 'index', cid: index, isFile: false })
  const links = link.arrToMap(linksArr.filter(notNull))
  return util.putTree({ links, key }, key)
}

export const putFile = async (content: FileContent, key: string, metadata: Partial<Metadata>): Promise<CID> => {
  const index = await util.putFile(content, key)
  return putWithMetadata(index, key, {
    ...metadata,
    isFile: true,
    mtime: Date.now()
  })
}

export const putTree = async(data: PrivateTreeData, key: string, metadata: Partial<Metadata>): Promise<CID> => {
  const index = await util.putTree(data, key)
  return putWithMetadata(index, key, {
    ...metadata,
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
