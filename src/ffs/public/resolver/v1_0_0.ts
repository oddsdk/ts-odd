import cbor from 'borc'
import ipfs, { CID, FileContent } from '../../../ipfs'
import { Link, Links, Metadata, FileSystemVersion } from '../../types'
import util from './util'

export const getIndexCID = async (cid: CID): Promise<CID | null> => {
  const links = await util.getLinks(cid)
  return links['index']?.cid || null
}

export const getFile = async (cid: CID): Promise<FileContent> => {
  const indexCID = await getIndexCID(cid)
  if(!indexCID) {
    throw new Error("File does not exist")
  }
  return ipfs.catBuf(indexCID)
}

export const getLinks = async (cid: CID): Promise<Links> => {
  const indexCID = await getIndexCID(cid)
  if(!indexCID) {
    throw new Error("Links do not exist")
  }
  const links = await util.getLinks(indexCID)
  return interpolateMetadata(links)
}

const linkArrToMap = (arr: Link[]): Links => {
  return arr.reduce((acc, cur) => {
    acc[cur.name] = cur
    return acc
  }, {} as Links)
}

const interpolateMetadata = async (links: Links): Promise<Links> => {
  const linkArr = await Promise.all(
    Object.values(links).map(async (link) => {
      const { isFile = false, mtime = Date.now() } = await getMetadata(link.cid)
      return {
        ...link,
        isFile,
        mtime
      }
    })
  )
  return linkArrToMap(linkArr)
}

const getBool = async (cid: CID): Promise<boolean | undefined> => {
  const buf = await ipfs.catBuf(cid)
  const bool = cbor.decode(buf)
  return typeof bool === 'boolean' ? bool : undefined
}

const getInt = async (cid: CID): Promise<number | undefined> => {
  const buf = await ipfs.catBuf(cid)
  const int = cbor.decode(buf)
  return typeof int === 'number' ? int : undefined
}

export const getMetadata = async (cid: CID): Promise<Partial<Metadata>> => {
  const links = await util.getLinks(cid)
  if(!links){
    throw new Error("bad node")
  }
  const [isFile, mtime] = await Promise.all([
    links['isFile']?.cid ? getBool(links['isFile'].cid) : undefined,
    links['mtime']?.cid ? getInt(links['mtime'].cid) : undefined
  ])
  return {
    isFile,
    mtime
  }
}

const notNull = <T>(obj: T | null): obj is T => {
  return obj !== null
}

export const putWithMetadata = async(index: CID, metadata: Partial<Metadata>): Promise<CID> => {
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
  return util.putLinks(links.filter(notNull))
}

export const putFile = async (content: FileContent, metadata: Partial<Metadata>): Promise<CID> => {
  const index = await ipfs.add(content)
  return putWithMetadata(index, {
    ...metadata,
    isFile: true
  })
}

export const putTree = async(links: Links, metadata: Partial<Metadata>): Promise<CID> => {
  const index = await util.putLinks(Object.values(links))
  return putWithMetadata(index, {
    ...metadata,
    isFile: false
  })
}

export default {
  getFile,
  getLinks,
  getMetadata,
  putFile,
  putTree
}
