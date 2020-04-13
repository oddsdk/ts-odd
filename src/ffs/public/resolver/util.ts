import dagPB from 'ipld-dag-pb'
import ipfs, { CID, FileContent, DAG_NODE_DATA } from '../../../ipfs'
import { BasicLinks, BasicLink, Link, Links, FileSystemVersion, Metadata } from '../../types'
import link from '../../link'
import { mapObjAsync } from '../../../common'

export const getFile = async (cid: CID): Promise<FileContent> => {
  return ipfs.catBuf(cid)
}

export const getLinks = async (cid: CID): Promise<Links> => {
  const raw = await ipfs.ls(cid)
  return link.arrToMap(
    raw.map(link.fromFSFile)
  )
}

export const getLinkCID = async(cid: CID, name: string): Promise<CID | null> => {
  const links = await getLinks(cid)
  return links[name]?.cid || null
}

export const putFile = async (content: FileContent): Promise<CID> => {
  return ipfs.add(content)
}

export const putLinks = async (links: BasicLink[]): Promise<CID> => { 
  const dagLinks = Object.values(links).map(link.toDAGLink)
  const node = new dagPB.DAGNode(DAG_NODE_DATA, dagLinks)
  return ipfs.dagPut(node)
}

export const getVersion = async(cid: CID): Promise<FileSystemVersion> => {
  const versionCID = await getLinkCID(cid, "version")
  if(!versionCID){
    return FileSystemVersion.v0_0_0
  }
  const versionStr = await ipfs.encoded.getString(versionCID)
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
  getLinks,
  getLinkCID,
  putFile,
  putLinks,
  getVersion,
  interpolateMetadata,
}
