import ipfs, { CID, FileContent, AddResult } from '../../ipfs'

import { Links, BasicLinks } from '../types'
import { Maybe } from '../../common'
import link from '../link'


export const getFile = async (cid: CID): Promise<FileContent> => {
  return ipfs.catBuf(cid)
}

export const getEncodedFile = async (cid: CID, key: Maybe<string>): Promise<FileContent> => {
  return ipfs.encoded.catAndDecode(cid, key) as Promise<FileContent>
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

export const putFile = async (content: FileContent): Promise<AddResult> => {
  return ipfs.add(content)
}

export const putFileEncoded = async (content: FileContent, key: Maybe<string>): Promise<AddResult> => {
  return ipfs.encoded.add(content, key)
}

export default {
  getFile,
  getEncodedFile,
  getLinks,
  getLinkCID,
  putLinks,
  putFile,
  putFileEncoded,
}
