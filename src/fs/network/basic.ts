// Hmm, not sure if this file belongs in fs
//
import ipfs, { CID, FileContent, AddResult } from '../../ipfs'

import { Links, BasicLinks } from '../types'
import { Maybe } from '../../common'
import link from '../link'


export const getFile = async (cid: CID, key: Maybe<string>): Promise<FileContent> => {
  return key ? ipfs.encoded.catAndDecode(cid, key) as Promise<FileContent> : ipfs.catBuf(cid)
}

export const getLinks = async (cid: CID, key: Maybe<string>): Promise<Links> => {
  if (key === null){
    const raw = await ipfs.ls(cid)
    return link.arrToMap(
      raw.map(link.fromFSFile)
    )
  }
  return ipfs.encoded.catAndDecode(cid, key) as Promise<Links>
}

export const getLinkCID = async (cid: CID, name: string, key: Maybe<string>): Promise<CID | null> => {
  const links = await getLinks(cid, key)
  return links[name]?.cid || null
}

export const putLinks = async (links: BasicLinks, key: Maybe<string>): Promise<CID> => {
  if (key) {
    const { cid } = await ipfs.encoded.add(links, key)
    return cid
  } else {
    const dagLinks = Object.values(links).map(link.toDAGLink)
    return ipfs.dagPutLinks(dagLinks)
  }
}

export const putFile = async (content: FileContent, key: Maybe<string>): Promise<AddResult> => {
  return key ? ipfs.encoded.add(content, key) : ipfs.add(content)
}

export default {
  getFile,
  getLinks,
  getLinkCID,
  putLinks,
  putFile,
}
