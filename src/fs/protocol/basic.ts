/** @internal */

/** @internal */
import ipfs, { CID, FileContent, AddResult } from '../../ipfs'

import { Links } from '../types'
import { Maybe } from '../../common'
import * as link from '../link'


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

export const putLinks = async (links: Links, key: Maybe<string>): Promise<AddResult> => {
  if (key) {
    const { cid, size } = await ipfs.encoded.add(links, key)

    const totalSize = Object.values(links)
                .reduce((acc, cur) => acc + cur.size, 0) + size
    return { cid, size: totalSize }
  } else {
    const dagLinks = Object.values(links).map(link.toDAGLink)
    return ipfs.dagPutLinks(dagLinks)
  }
}

export const putFile = async (content: FileContent, key: Maybe<string>): Promise<AddResult> => {
  return key ? ipfs.encoded.add(content, key) : ipfs.add(content)
}
