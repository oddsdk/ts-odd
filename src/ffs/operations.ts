import dagPB from 'ipld-dag-pb'
import ipfs, { CID, FileContent, DAG_NODE_DATA } from '../ipfs'
import { BasicLinks, BasicLink, Link, Links, FileSystemVersion, Metadata, PrivateTreeData } from './types'
import link from './link'
import { isBlob, blobToBuffer, mapObjAsync } from '../common'
import { TreeData } from './types'
import { getTree } from './private/resolver/v0_0_0'

export const getFile = async (cid: CID, key?: string): Promise<FileContent> => {
  return ipfs.encoded.catAndDecode(cid, key)
}

export const getTreeData = async (cid: CID, key?: string): Promise<TreeData> => {
  if(key){
    const maybeData = ipfs.encoded.catAndDecode(cid, key)
    if(isTreeData(maybeData)) {
      return maybeData
    } else {
      throw new Error(`Not a tree: ${cid}`)
    }
  } else {
    const raw = await ipfs.ls(cid)
    const links = link.arrToMap(
      raw.map(link.fromFSFile)
    )
    return { links }
  }
}

export const getLinks = async (cid: CID, key?: string): Promise<Links> => {
  const data = await getTreeData(cid, key)
  return data.links
}

export const getLinkCID = async(cid: CID, name: string, key?: string): Promise<CID | null> => {
  const links = await getLinks(cid, key)
  return links[name]?.cid || null
}

export const isLink = (link: any): link is Link => {
  return typeof link?.name === 'string' && typeof link?.cid === 'string'
}

export const isLinks = (obj: any): obj is Links => {
  return Object.values(obj).every(isLink)
}

export const isTreeData = (obj: any): obj is TreeData => {
  return isLinks(obj?.links)
}

export const isPrivateTreeData = (data: any): data is PrivateTreeData => {
  return data?.key !== undefined
}

export const putTree = async (data: TreeData, key?: string): Promise<CID> => { 
  if(key) {
    return ipfs.encoded.add(data, key)
  } else {
    return putLinks(data.links)
  }
}

export const putLinks = async (links: Links, key?: string): Promise<CID> => {
  if(key) {
    return ipfs.encoded.add(links, key)
  } else {
    const dagLinks = Object.values(links).map(link.toDAGLink)
    return ipfs.dagPutLinks(dagLinks)
  }
}

export const putFile = async (content: FileContent, key?: string): Promise<CID> => {
  return key ? ipfs.encoded.add(content, key) : ipfs.add(content)
}

export default {
  getFile,
  getTreeData,
  getLinks,
  getLinkCID,
  isLink,
  isLinks,
  isTreeData,
  isPrivateTreeData,
  putTree,
  putLinks,
  putFile,
}
