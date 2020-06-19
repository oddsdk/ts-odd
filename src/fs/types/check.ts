import { isString, isObject, isNum } from '../../common'
import { CID } from '../../ipfs'
import { Tree, File, Link, Links, HeaderV1, NodeMap, SemVer, NodeInfo, PinMap, HeaderFile, HeaderTree } from '../types'

export const hasHeader = (obj: any): obj is HeaderFile | HeaderTree => {
  return isObject(obj) && obj.getHeader !== undefined
}

export const isFile = (obj: any): obj is File => {
  return isObject(obj) && obj.content !== undefined 
}

export const isTree = (obj: any): obj is Tree => {
  return isObject(obj) && obj.ls !== undefined 
}

export const isLink = (link: any): link is Link => {
  return typeof link?.name === 'string' 
      && typeof link?.cid === 'string'
}

export const isLinks = (obj: any): obj is Links => {
  return isObject(obj)
      && Object.values(obj).every(isLink)
}

export const isPinMap = (obj: any): obj is PinMap => {
  return isObject(obj)
      && Object.values(obj).every(isCIDList)
}

export const isHeaderV1 = (obj: any): obj is HeaderV1 => {
  return isObject(obj) 
      && isSemVer(obj.version)
      && (isString(obj.key) || obj.key === null)
      && isNodeMap(obj.fileIndex)
      && isPinMap(obj.pins)
}

export const isNodeInfo = (obj: any): obj is NodeInfo => {
  return isObject(obj) 
      && isCID(obj.cid) 
      && isHeaderV1(obj)
}

export const isNodeMap = (obj: any): obj is NodeMap => {
  return isObject(obj) 
      && Object.values(obj).every(isNodeInfo)
}

export const isCID = (obj: any): obj is CID => {
  return isString(obj)
}

export const isCIDList = (obj: any): obj is CID[] => {
  return Array.isArray(obj)
      && obj.every(isCID)
}

export const isSemVer = (obj: any): obj is SemVer => {
  if (!isObject(obj)) return false
  const { major, minor, patch } = obj 
  return isNum(major) && isNum(minor) && isNum(patch)
}


export default {
  isFile,
  isTree,
  isLink,
  isLinks,
  isHeaderV1,
  isNodeMap,
  isCIDList,
  isSemVer
}
