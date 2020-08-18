/** @internal */

/** @internal */
import { isString, isObject, isNum, isBool } from '../../common'
import { CID } from '../../ipfs'
import { Tree, File, Link, Links, SemVer, Skeleton, ChildrenMetadata, Metadata, TreeInfo, FileInfo } from '../types'


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

export const isMetadata = (obj: any): obj is Metadata => {
  return isObject(obj) 
      && isBool(obj.isFile)
      && isNum(obj.mtime)
      && isNum(obj.ctime)
      && isSemVer(obj.version)
}

export const isSkeleton = (obj: any): obj is Skeleton => {
  return isObject(obj) 
      && Object.values(obj).every(val => (
        isObject(val)
        && isCID(val.cid)
        && isCID(val.userland)
        && isCID(val.metadata)
        && isSkeleton(val.children)
      ))
}

export const isChildrenMetadata = (obj: any): obj is ChildrenMetadata => {
  return isObject(obj) 
      && Object.values(obj).every(isMetadata)
}

export const isTreeInfo = (obj: any): obj is TreeInfo => {
  return isObject(obj)
    && isCID(obj.userland)
    && isSkeleton(obj.skeleton)
    && isChildrenMetadata(obj.children)
    && isMetadata(obj.metadata)
    && obj.metadata.isFile === false
}

export const isFileInfo = (obj: any): obj is FileInfo => {
  return isObject(obj)
    && isCID(obj.userland)
    && isMetadata(obj.metadata)
    && obj.metadata.isFile === true
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
