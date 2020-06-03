import ipfs, { CID, FileContent, AddResult } from '../../ipfs'

import { Links, BasicLinks, PrivateTreeData, TreeData } from '../types'
import { Maybe, isJust } from '../../common'
import check from '../types/check'

// Normalization

import link from '../link'


export const getFile = async (cid: CID, key: Maybe<string>): Promise<FileContent> => {
  return key ? ipfs.encoded.catAndDecode(cid, key) : ipfs.catBuf(cid)
}

export const getTreeData = async (cid: CID, parentKey: Maybe<string>): Promise<TreeData | PrivateTreeData | null> => {
  if (parentKey === null) {
    const links = await getLinks(cid, null)
    return { links }
  }
  const data = parentKey ? await ipfs.encoded.catAndDecode(cid, parentKey) : await ipfs.catBuf(cid)
  if(check.isTreeData(data)) {
    return data
  } else if(check.isLinks(data)) {
    return { links: data }
  }
  else {
    return null
  }
}

export const getLinks = async (cid: CID, key: Maybe<string>): Promise<Links> => {
  if(key === null){
    const raw = await ipfs.ls(cid)
    return link.arrToMap(
      raw.map(link.fromFSFile)
    )
  }

  const data = await getTreeData(cid, key)
  return isJust(data) ? data.links : {}
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
  getTreeData,
  getLinks,
  getLinkCID,
  putTree,
  putLinks,
  putFile,
}
