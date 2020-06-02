import ipfs, { CID, FileContent, AddResult } from '../../ipfs'

import { Links, BasicLinks, PrivateTreeData, TreeData } from '../types'
import { Maybe } from '../../common'
import check from '../types/check'

// Normalization

import link from '../link'


export const getFile = async (cid: CID, key: Maybe<string>): Promise<FileContent> => {
  return key ? ipfs.encoded.catAndDecode(cid, key) : ipfs.catBuf(cid)
}

export const getPrivateTreeData = async (cid: CID, key: string): Promise<PrivateTreeData> => {
  const data = await ipfs.encoded.catAndDecode(cid, key)
  if (!check.isPrivateTreeData(data)) {
    throw new Error(`Does not contain tree data: ${cid}`)
  }
  return data
}

export const getLinks = async (cid: CID, key: Maybe<string>): Promise<Links> => {
  if(key === null){
    const raw = await ipfs.ls(cid)
    return link.arrToMap(
      raw.map(link.fromFSFile)
    )
  }

  const obj = await ipfs.encoded.catAndDecode(cid, key)

  if (check.isTreeData(obj)) {
    return obj.links
  } else if (check.isLinks(obj)) {
    return obj
  } else {
    return {}
  }
}

export const getLinkCID = async (cid: CID, name: string, key: Maybe<string>): Promise<CID | null> => {
  const links = await getLinks(cid, key)
  return links[name]?.cid || null
}

export const putTree = async (data: TreeData, key: Maybe<string>): Promise<CID> => {
  if (key) {
    const { cid } = await ipfs.encoded.add(data, key)
    return cid
  } else {
    return putLinks(data.links, null)
  }
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
  getPrivateTreeData,
  getLinks,
  getLinkCID,
  putTree,
  putLinks,
  putFile,
}
