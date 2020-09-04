/** @internal */

/** @internal */
import * as ipfs from '../../ipfs'
import { CID, FileContent, AddResult } from '../../ipfs'

import { Links } from '../types'
import * as link from '../link'


export const getFile = async (cid: CID): Promise<FileContent> => {
  return ipfs.catBuf(cid)
}

export const getEncryptedFile = async (cid: CID, key: string): Promise<FileContent> => {
  return ipfs.encoded.catAndDecode(cid, key) as Promise<FileContent>
}

export const putFile = async (content: FileContent): Promise<AddResult> => {
  return ipfs.add(content)
}

export const putEncryptedFile = async (content: FileContent, key: string): Promise<AddResult> => {
  return ipfs.encoded.add(content, key)
}

export const getLinks = async (cid: CID): Promise<Links> => {
  const raw = await ipfs.ls(cid)
  const links = link.arrToMap(
    raw.map(link.fromFSFile)
  )
  // ipfs.ls does not return size, so we need to interpolate that in ourselves
  const dagNode = await ipfs.dagGet(cid)
  dagNode.Links.forEach((l) => {
    if(links[l.Name] && links[l.Name].size === 0){
      links[l.Name].size = l.Tsize
    }
  })
  return links
}

export const putLinks = async (links: Links): Promise<AddResult> => {
  const dagLinks = Object.values(links).map(link.toDAGLink)
  return ipfs.dagPutLinks(dagLinks)
}
