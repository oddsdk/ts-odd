import { isString, isObject, isNum, arrContains } from '../../common'
import { CID } from '../../ipfs'

import { File, Link, Links, TreeData, PrivateTreeData, CacheData, CacheMap, PinMap, SemVer } from '../types'


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
  return data?.key !== undefined
}

export const cacheValues = ['links', 'key', 'isFile', 'mtime', 'version'] 

export const isCacheData = (obj: any): obj is CacheData => {
  return isObject(obj) 
    && isLinks(obj.links)
    && Object.keys(obj).every(key => arrContains(cacheValues, key))
}

export const isCacheMap = (obj: any): obj is CacheMap => {
  return isObject(obj) && Object.values(obj).every(isCacheData)
}

export const isCIDList = (obj: any): obj is CID[] => {
  return Array.isArray(obj) && obj.every(isString)
}

export const isPinMap = (obj: any): obj is PinMap => {
  return isObject(obj) && Object.values(obj).every(isCIDList)
}

export const isSemVer = (obj: any): obj is SemVer => {
  if (!isObject(obj)) return false
  const { major, minor, patch } = obj as any
  return isNum(major) && isNum(minor) && isNum(patch)
}


export default {
  isFile,
  isLink,
  isLinks,
  isTreeData,
  isPrivateTreeData,
  isCacheData,
  isCacheMap,
  isCIDList,
  isPinMap,
  isSemVer
}
