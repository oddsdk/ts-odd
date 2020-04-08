import cbor from 'borc'
import ipfs, { CID, FileContent } from '../../../ipfs'
import { Links, Metadata, FileSystemVersion } from '../../types'
import link from '../../link'
import util from './util'

export const getFile = async (cid: CID): Promise<FileContent> => {
  const indexCID = await util.getLinkCID(cid, 'index')
  if(!indexCID) {
    throw new Error("File does not exist")
  }
  return ipfs.catBuf(indexCID)
}

export const getLinks = async (cid: CID): Promise<Links> => {
  const indexCID = await util.getLinkCID(cid, 'index')
  if(!indexCID) {
    throw new Error("Links do not exist")
  }
  const links = await util.getLinks(indexCID)
  const withMetadata = await util.interpolateMetadata(links, getMetadata)
  return link.arrToMap(withMetadata)
}

export const getMetadata = async (cid: CID): Promise<Metadata> => {
  const links = link.arrToMap(await util.getLinks(cid))
  const [isFile, mtime] = await Promise.all([
    links['isFile']?.cid ? ipfs.encoded.getBool(links['isFile'].cid) : undefined,
    links['mtime']?.cid ? ipfs.encoded.getInt(links['mtime'].cid) : undefined
  ])
  return {
    isFile,
    mtime
  }
}

export const putWithMetadata = async(index: CID, metadata: Metadata): Promise<CID> => {
  const withVersion = {
    ...metadata,
    version: FileSystemVersion.v1_0_0
  }
  const links = await Promise.all(
    Object.entries(withVersion).map(async ([name, val]) => {
      if(val !== undefined){
        const cid = await ipfs.add(cbor.encode(val))
        return { name, cid, isFile: true }
      }
      return null
    })
  )
  links.push({ name: 'index', cid: index, isFile: true })
  return util.putLinks(links.filter(util.notNull))
}

export const putFile = async (content: FileContent, metadata: Partial<Metadata>): Promise<CID> => {
  const index = await ipfs.add(content)
  return putWithMetadata(index, {
    ...metadata,
    isFile: true,
    mtime: Date.now()
  })
}

export const putTree = async(links: Links, metadata: Partial<Metadata>): Promise<CID> => {
  const index = await util.putLinks(Object.values(links))
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
