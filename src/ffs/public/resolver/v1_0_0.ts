import cbor from 'borc'
import ipfs, { CID, FileContent } from '../../../ipfs'
import { Links, Metadata, FileSystemVersion, Header } from '../../types'
import operations from '../../operations'
import { notNull } from '../../../common'
import link from '../../link'

export const getFile = async (cid: CID): Promise<FileContent> => {
  const indexCID = await operations.getLinkCID(cid, 'index')
  if(!indexCID) {
    throw new Error("File does not exist")
  }
  return operations.getFile(indexCID)
}

export const getLinks = async (cid: CID): Promise<Links> => {
  const indexCID = await operations.getLinkCID(cid, 'index')
  if(!indexCID) {
    throw new Error("Links do not exist")
  }
  const links = await operations.getLinks(indexCID)
  return await operations.interpolateMetadata(links, getMetadata)
}

export const getMetadata = async (cid: CID): Promise<Metadata> => {
  const links = await operations.getLinks(cid)
  const [isFile, mtime] = await Promise.all([
    links['isFile']?.cid ? ipfs.encoded.getBool(links['isFile'].cid) : undefined,
    links['mtime']?.cid ? ipfs.encoded.getInt(links['mtime'].cid) : undefined
  ])
  return {
    isFile,
    mtime
  }
}

export const putWithMetadata = async(index: CID, header: Header): Promise<CID> => {
  const withVersion = {
    ...header,
    version: FileSystemVersion.v1_0_0
  }
  const linksArr = await Promise.all(
    Object.entries(withVersion).map(async ([name, val]) => {
      if(val !== undefined){
        const cid = await operations.putFile(cbor.encode(val))
        return { name, cid, isFile: true }
      }
      return null
    })
  )
  linksArr.push({ name: 'index', cid: index, isFile: false })
  const links = link.arrToMap(linksArr.filter(notNull))
  return operations.putLinks(links)
}

export const putFile = async (content: FileContent, metadata: Partial<Metadata>): Promise<CID> => {
  const index = await operations.putFile(content)
  return putWithMetadata(index, {
    ...metadata,
    isFile: true,
    mtime: Date.now()
  })
}

export const putTree = async(links: Links, metadata: Partial<Metadata>): Promise<CID> => {
  const index = await operations.putLinks(links)
  return putWithMetadata(index, {
    ...metadata,
    isFile: false,
    mtime: Date.now()
  })
}

export default {
  getFile,
  getLinks,
  getMetadata,
  putFile,
  putTree
}
