import dagPB from 'ipld-dag-pb'
import ipfs, { CID, FileContent } from '../../../ipfs'
import { BasicLink, Link, Links, FileSystemVersion, Metadata } from '../../types'
import link from '../../link'

export const getFile = async (cid: CID): Promise<FileContent> => {
  return ipfs.catBuf(cid)
}

export const getLinksArr = async (cid: CID): Promise<Link[]> => {
  const links = await ipfs.ls(cid)
  return links.map(link.fromFSFile)
}

export const getLinks = async (cid: CID): Promise<Links> => {
  const links = await getLinksArr(cid)
  return link.arrToMap(links)
}

export const getLinkCID = async(cid: CID, name: string): Promise<CID | null> => {
  const links = await getLinksArr(cid)
  return links.find(l => l.name === name)?.cid || null
}

export const putFile = async (content: FileContent): Promise<CID> => {
  return ipfs.add(content)
}

export const putLinks = async (links: BasicLink[]): Promise<CID> => { 
  const dagLinks = Object.values(links).map(link.toDAGLink)
  const node = new dagPB.DAGNode(Buffer.from([8, 1]), dagLinks)
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
  links: BasicLink[],
  getMetadata: (cid: CID) => Promise<Metadata>
): Promise<Link[]> => {
  return Promise.all(
    links.map(async (link) => {
      const { isFile = false, mtime } = await getMetadata(link.cid)
      return {
        ...link,
        isFile,
        mtime
      }
    })
  )
}

export default {
  getFile,
  getLinksArr,
  getLinks,
  getLinkCID,
  putFile,
  putLinks,
  getVersion,
  interpolateMetadata,
}
