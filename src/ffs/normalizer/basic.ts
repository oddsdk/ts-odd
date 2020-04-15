import ipfs, { CID, FileContent } from '../../ipfs'
import { Links, BasicLinks, PrivateTreeData, Metadata, FileSystemVersion } from '../types'
import link from '../link'
import { TreeData } from '../types'
import check from '../types/check'
import { mapObjAsync } from '../../common'

export const getFile = async (cid: CID, key?: string): Promise<FileContent> => {
  return key ? ipfs.encoded.catAndDecode(cid, key) : ipfs.catBuf(cid)
}

export const getPrivateTreeData = async (cid: CID, key: string): Promise<PrivateTreeData> => {
  const data = await ipfs.encoded.catAndDecode(cid, key)
  if(!check.isPrivateTreeData(data)){
    throw new Error(`Does not contain tree data: ${cid}`)
  }
  return data
}

export const getLinks = async (cid: CID, key?: string): Promise<Links> => {
  if(key) {
    const obj = await ipfs.encoded.catAndDecode(cid, key)
    if(check.isTreeData(obj)){
      return obj.links
    } else if(check.isLinks(obj)) {
      return obj
    } else {
      return {}
    }
  } else {
    const raw = await ipfs.ls(cid)
    return link.arrToMap(
      raw.map(link.fromFSFile)
    )
  }
}

export const getLinkCID = async(cid: CID, name: string, key?: string): Promise<CID | null> => {
  const links = await getLinks(cid, key)
  return links[name]?.cid || null
}

export const putTree = async (data: TreeData, key?: string): Promise<CID> => { 
  if(key) {
    return ipfs.encoded.add(data, key)
  } else {
    return putLinks(data.links)
  }
}

export const putLinks = async (links: BasicLinks, key?: string): Promise<CID> => {
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

export const getVersion = async(cid: CID, key?: string): Promise<FileSystemVersion> => {
  const versionCID = await getLinkCID(cid, "version", key)
  if(!versionCID){
    return FileSystemVersion.v0_0_0
  }
  const versionStr = await ipfs.encoded.getString(versionCID, key)
  switch(versionStr) {
    case "1.0.0": 
      return FileSystemVersion.v1_0_0
    default: 
      return FileSystemVersion.v0_0_0
  }
}

export const interpolateMetadata = async (
  links: BasicLinks,
  getMetadata: (cid: CID) => Promise<Metadata>
): Promise<Links> => {
  return mapObjAsync(links, async (link) => {
    const { isFile = false, mtime } = await getMetadata(link.cid)
    return {
      ...link,
      isFile,
      mtime
    }
  })
}

export default {
  getFile,
  getPrivateTreeData,
  getLinks,
  getLinkCID,
  putTree,
  putLinks,
  putFile,
  getVersion,
  interpolateMetadata,
}
