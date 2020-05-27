import { isString, isObject, isNum, arrContains } from '../../common'
import { CID } from '../../ipfs'
import { File, Link, Links, TreeData, PrivateTreeData, Header, CacheMap, PinMap, SemVer } from '../types'


export const isFile = (obj: any): obj is File => {
  return obj.isFile
}

export const isLink = (link: any): link is Link => {
  return typeof link?.name === 'string' && typeof link?.cid === 'string'
}

export const isLinks = (obj: any): obj is Links => {
  return typeof obj === 'object' && Object.values(obj).every(isLink)
}

export const isTreeData = (obj: any): obj is TreeData => {
  return isObject(obj) && isLinks(obj.links)
}

export const isPrivateTreeData = (data: any): data is PrivateTreeData => {
  return isObject(data) && data?.key !== undefined
}

export const headerValues = ['version', 'key', 'pins', 'cache', 'isFile', 'mtime'] 

export const isHeader = (obj: any): obj is Header => {
  return isObject(obj) 
    && isSemVer(obj.version)
    && Object.keys(obj).every(key => arrContains(headerValues, key))
}

export const isCacheMap = (obj: any): obj is CacheMap => {
  return isObject(obj) && Object.values(obj).every(isHeader)
}

export const isCIDList = (obj: any): obj is CID[] => {
  return Array.isArray(obj) && obj.every(isString)
}

export const isPinMap = (obj: any): obj is PinMap => {
  return isObject(obj) && Object.values(obj).every(isCIDList)
}

export const isSemVer = (obj: any): obj is SemVer => {
  if (!isObject(obj)) return false
  const { major, minor, patch } = obj 
  return isNum(major) && isNum(minor) && isNum(patch)
}


export default {
  isFile,
  isLink,
  isLinks,
  isTreeData,
  isPrivateTreeData,
  isHeader,
  isCacheMap,
  isCIDList,
  isPinMap,
  isSemVer
}
