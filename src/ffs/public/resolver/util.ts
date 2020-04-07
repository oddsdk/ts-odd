import cbor from 'borc'
import dagPB from 'ipld-dag-pb'
import ipfs, { CID, FileContent } from '../../../ipfs'
import { BasicLink, Links, Metadata, FileSystemVersion } from '../../types'
import link from '../../link'

export const getFile = async (cid: CID): Promise<FileContent> => {
  return ipfs.catBuf(cid)
}

export const getLinks = async (cid: CID): Promise<Links> => {
  const links = await ipfs.ls(cid)
  return links.reduce((acc, cur) => {
    acc[cur.name || ''] = link.fromFSFile(cur)
    return acc
  }, {} as Links)
}

export const putFile = async (content: FileContent): Promise<CID> => {
  return ipfs.add(content)
}

export const putLinks = async (links: BasicLink[]): Promise<CID> => { 
  const dagLinks = Object.values(links).map(link.toDAGLink)
  const node = new dagPB.DAGNode(Buffer.from([8, 1]), dagLinks)
  return ipfs.dagPut(node)
}

const getString = async (cid: CID): Promise<string | undefined> => {
  const buf = await ipfs.catBuf(cid)
  const str = cbor.decode(buf)
  return typeof str === 'string' ? str : undefined
}

export const getVersion = async(cid: CID): Promise<FileSystemVersion> => {
  const links = await getLinks(cid)
  const versionCID = links["version"]?.cid
  if(!versionCID){
    return FileSystemVersion.v0_0_0
  }
  const versionStr = await getString(versionCID)
  switch(versionStr) {
    case "1.0.0": 
      return FileSystemVersion.v1_0_0
    default: 
      return FileSystemVersion.v0_0_0
  }
}

export default {
  getFile,
  getLinks,
  putFile,
  putLinks,
  getVersion,
}
