import { CID, FileContent } from '../../../ipfs'
import { Metadata, Header, TreeData, PrivateTreeData, PinMap } from '../../types'
import check from '../../types/check'
import basic from '../basic'
import header from '../header'
import semver from '../../semver'
import { isNum, isBool } from '../../../common'
import { defaultError } from '../errors'

export const getFile = async (cid: CID, key?: string): Promise<FileContent> => {
  const indexCID = await basic.getLinkCID(cid, 'index', key)
  if (!indexCID) {
    throw new Error("File does not exist")
  }
  return basic.getFile(indexCID, key)
}

export const getTreeData = async (cid: CID, key?: string): Promise<TreeData | PrivateTreeData> => {
  const indexCID = await basic.getLinkCID(cid, 'index', key)
  if (!indexCID) throw new Error(`Links do not exist: ${indexCID}`)

  const links = await basic.getLinks(indexCID, key)
  const childKey = key ? await header.getChildKey(cid, key) : undefined
  const withMetadata = await header.interpolateMetadata(links,
    (linkCID: CID) => getMetadata(linkCID, childKey)
  )

  return { links: withMetadata, key: childKey }
}

export const getPins = async (cid: CID, key: string): Promise<PinMap> => {
  const pins = await header.getValue(cid, "pins", check.isPinMap, key)
  return defaultError(pins, {})
}

export const getMetadata = async (cid: CID, key?: string): Promise<Metadata> => {
  const links = await basic.getLinks(cid, key)
  const [isFile, mtime] = await Promise.all([
    header.getValue(links, 'isFile', isBool, key),
    header.getValue(links, 'mtime', isNum, key)
  ])
  return {
    isFile: defaultError(isFile, undefined),
    mtime: defaultError(mtime, undefined)
  }
}
export const putFile = async (
  content: FileContent,
  headerVal: Partial<Header>,
  key?: string
): Promise<CID> => {
  const index = await basic.putFile(content, key)
  return header.put(index, {
    ...headerVal,
    isFile: true,
    mtime: Date.now(),
    version: semver.encode(1, 0, 0)
  }, key)
}

export const putTree = async (
  data: TreeData | PrivateTreeData,
  headerVal: Partial<Header>,
  key?: string
): Promise<CID> => {
  const index = await basic.putLinks(data.links, key)
  const childKey = check.isPrivateTreeData(data) ? data.key : undefined
  return header.put(index, {
    ...headerVal,
    isFile: false,
    mtime: Date.now(),
    version: semver.encode(1, 0, 0),
    key: childKey
  }, key)
}

export default {
  getFile,
  getTreeData,
  getMetadata,
  getPins,
  putFile,
  putTree
}
