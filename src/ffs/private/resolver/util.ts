import cbor from 'borc'
import ipfs, { CID, FileContent } from '../../../ipfs'
import keystore from '../../../keystore'
import { BasicLinks, Link, Links, Metadata, FileSystemVersion, PrivateTreeData } from '../../types'
import { isBlob, blobToBuffer } from '../../../common'
import { mapObjAsync } from '../../../common'

export const getDirectFile = async (cid: CID, key: string): Promise<FileContent> => {
  const encrypted = await ipfs.catBuf(cid)
  return await decryptContent(encrypted, key)
}

const isTreeData = (obj: PrivateTreeData | Links): obj is PrivateTreeData => {
  return obj.links !== undefined && obj.key !== undefined
}

export const encryptNode = async (node: PrivateTreeData | Links, keyStr: string): Promise<Uint8Array> => {
  const encoded = cbor.encode(node)
  return keystore.encrypt(encoded, keyStr)
}

export const encryptContent = async (content: FileContent, keyStr: string): Promise<Uint8Array> => {
  if(isBlob(content)){
    content = await blobToBuffer(content)
  }
  const encoded = cbor.encode(content)
  return keystore.encrypt(encoded, keyStr)
}

export const decryptNode = async (encrypted: Uint8Array, keyStr: string): Promise<PrivateTreeData | Links> => {
  const decrypted = await keystore.decrypt(encrypted, keyStr)
  return cbor.decode(decrypted)
}

export const decryptContent = async (encrypted: Uint8Array, keyStr: string): Promise<FileContent> => {
  const decrypted = await keystore.decrypt(encrypted, keyStr)
  return cbor.decode(decrypted)
}

export const getDirectTree = async (cid: CID, key: string): Promise<PrivateTreeData> => {
  const content = await ipfs.catBuf(cid)
  const decrypted = await decryptNode(content, key)
  if(!isTreeData(decrypted)){
    throw new Error("Not full tree")
  }
  return decrypted
}

export const getDirectLinks = async (cid: CID, key: string): Promise<Links> => {
  const content = await ipfs.catBuf(cid)
  const decrypted = await decryptNode(content, key)
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
  const encrypted = await encryptContent(content, key)
  return ipfs.add(encrypted)
}

export const putDirectTree = async (data: PrivateTreeData, key: string): Promise<CID> => { 
  const encrypted = await encryptNode(data, key)
  return ipfs.add(encrypted)
}

export const putDirectLinks = async (links: Links, key: string): Promise<CID> => { 
  const encrypted = await encryptNode(links, key)
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
