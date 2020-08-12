/** @internal */

/** @internal */
import ipfs, { CID, FileContent, AddResult } from '../../ipfs'

import { Links } from '../types'
import { Maybe } from '../../common'
import * as link from '../link'


export const getFile = async (cid: CID, key: Maybe<string>): Promise<FileContent> => {
  return key ? ipfs.encoded.catAndDecode(cid, key) as Promise<FileContent> : ipfs.catBuf(cid)
}

export const putFile = async (content: FileContent, key: Maybe<string>): Promise<AddResult> => {
  return key ? ipfs.encoded.add(content, key) : ipfs.add(content)
}

export const getLinks = async (cid: CID): Promise<Links> => {
  const raw = await ipfs.ls(cid)
  return link.arrToMap(
    raw.map(link.fromFSFile)
  )
}

export const putLinks = async (links: Links): Promise<AddResult> => {
  const dagLinks = Object.values(links).map(link.toDAGLink)
  return ipfs.dagPutLinks(dagLinks)
}
