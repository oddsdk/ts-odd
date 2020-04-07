import dagPB from 'ipld-dag-pb'
import cbor from 'borc'
import ipfs, { CID, FileContent } from '../../../ipfs'
import { Links, Metadata } from '../../types'
import link from '../../link'
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
  return util.getLinks(cid)
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

export const putFile = async (content: FileContent, _metadata: Partial<Metadata>): Promise<CID> => {
  return ipfs.add(content)
}

export const putLinks = async (links: Links): Promise<CID> => { 
  const dagLinks = Object.values(links).map(link.toDAGLink)
  const node = new dagPB.DAGNode(Buffer.from([8, 1]), dagLinks)
  return ipfs.dagPut(node)
}

export const putTree = async(links: Links, metadata: Partial<Metadata>): Promise<CID> => {
  const metadataLinks = {} as Links
  await Promise.all(
    Object.entries(metadata).map(async ([name, val]) => {
      if(val !== undefined){
        const cid = await ipfs.add(cbor.encode(val))
        metadataLinks[name] = { name, cid, isFile: true }
      }
    })
  )
  const indexCID = await util.putLinks(links)
  metadataLinks['index'] = { name: 'index', cid: indexCID, isFile: true }
  return await util.putLinks(metadataLinks)
}

export default {
  getFile,
  getLinks,
  getMetadata,
  putFile,
  putLinks,
  putTree
}
