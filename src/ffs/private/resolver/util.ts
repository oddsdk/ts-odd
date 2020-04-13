import ipfs, { CID, FileContent } from '../../../ipfs'
import { BasicLink, Link, Links, Metadata, FileSystemVersion, PrivateTreeData } from '../../types'
import util from '../util'

export const getDirectFile = async (cid: CID, key: string): Promise<FileContent> => {
  const encrypted = await ipfs.catBuf(cid)
  return await util.decryptContent(encrypted, key)
}

const isTreeData = (obj: PrivateTreeData | Links): obj is PrivateTreeData => {
  return obj.links !== undefined && obj.key !== undefined
}

export const getDirectTree = async (cid: CID, key: string): Promise<PrivateTreeData> => {
  const content = await ipfs.catBuf(cid)
  const decrypted = await util.decryptNode(content, key)
  if(!isTreeData(decrypted)){
    throw new Error("Not full tree")
  }
  return decrypted
}

export const getEncryptedBool = async (cid: CID, key: string): Promise<boolean | undefined> => {
  const encrypted = await ipfs.catBuf(cid)
  const bool = await util.decryptContent(encrypted, key)
  return typeof bool === 'boolean' ? bool : undefined
}

export const getEncryptedInt = async (cid: CID, key: string): Promise<number | undefined> => {
  const encrypted = await ipfs.catBuf(cid)
  const int = await util.decryptContent(encrypted, key)
  return typeof int === 'number' ? int : undefined
}

export const getDirectLinks = async (cid: CID, key: string): Promise<Links> => {
  const content = await ipfs.catBuf(cid)
  const decrypted = await util.decryptNode(content, key)
  return isTreeData(decrypted) ? decrypted.links : decrypted
}

export const getDirectLinksArr = async (cid: CID, key: string): Promise<Link[]> => {
  const links = await getDirectLinks(cid, key)
  return Object.values(links)
}

export const getDirectLinkCID = async(cid: CID, name: string, key: string): Promise<CID | null> => {
  const links = await getDirectLinks(cid, key)
  return links[name]?.cid || null
}

export const putDirectFile = async (content: FileContent, key: string): Promise<CID> => {
  const encrypted = await util.encryptContent(content, key)
  return ipfs.add(encrypted)
}

export const putDirectTree = async (data: PrivateTreeData, key: string): Promise<CID> => { 
  const encrypted = await util.encryptNode(data, key)
  return ipfs.add(encrypted)
}

export const putDirectLinks = async (links: Links, key: string): Promise<CID> => { 
  const encrypted = await util.encryptNode(links, key)
  return ipfs.add(encrypted)
}

export const getVersion = async(cid: CID, key: string): Promise<FileSystemVersion> => {
  const versionCID = await getDirectLinkCID(cid, "version", key)
  if(!versionCID){
    return FileSystemVersion.v0_0_0
  }
  const versionStr = await getDirectFile(versionCID, key)
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
  getEncryptedBool,
  getEncryptedInt,
  getDirectFile,
  getDirectTree,
  getDirectLinks,
  getDirectLinksArr,
  getDirectLinkCID,
  putDirectFile,
  putDirectTree,
  putDirectLinks,
  getVersion,
  interpolateMetadata
}
