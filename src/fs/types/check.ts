/** @internal */

/** @internal */
import { isString, isObject, isNum, isBool } from '../../common'
import { CID } from '../../ipfs'
import { Tree, File, Link, Links, BaseLink } from '../types'
import { Skeleton, TreeInfo, FileInfo, TreeHeader, FileHeader } from '../protocol/public/types'
import { SemVer } from '../semver'
import { Metadata, UnixMeta } from '../metadata'


export const isFile = (obj: any): obj is File => {
  return isObject(obj) && obj.content !== undefined
}

export const isTree = (obj: any): obj is Tree => {
  return isObject(obj) && obj.ls !== undefined
}

export const isBaseLink = (obj: any): obj is BaseLink => {
  return isObject(obj)
    && isString(obj.name)
    && isNum(obj.size)
    && isBool(obj.isFile)
}

export const isLink = (obj: any): obj is Link => {
  return isBaseLink(obj)
    && isCID((obj as any).cid)
}

export const isLinks = (obj: any): obj is Links => {
  return isObject(obj)
      && Object.values(obj).every(isLink)
}

export const isUnixMeta = (obj: any): obj is UnixMeta => {
  return isObject(obj) 
      && isNum(obj.mtime)
      && isNum(obj.ctime)
      && isNum(obj.mode)
      && isString(obj._type)
}

export const isMetadata = (obj: any): obj is Metadata => {
  return isObject(obj) 
      && isUnixMeta(obj.unixMeta)
      && isBool(obj.isFile)
      && isSemVer(obj.version)
}

export const isSkeleton = (obj: any): obj is Skeleton => {
  return isObject(obj) 
      && Object.values(obj).every(val => (
        isObject(val)
        && isCID(val.cid)
        && isCID(val.userland)
        && isCID(val.metadata)
        && isSkeleton(val.subSkeleton)
      ))
}

export const isTreeHeader = (obj: any): obj is TreeHeader => {
  return isObject(obj)
    && isSkeleton(obj.skeleton)
    && isMetadata(obj.metadata)
    && obj.metadata.isFile === false
}

export const isTreeInfo = (obj: any): obj is TreeInfo => {
  return isTreeHeader(obj)
    && isCID((obj as any).userland)
}

export const isFileHeader = (obj: any): obj is FileHeader => {
  return isObject(obj)
    && isMetadata(obj.metadata)
    && obj.metadata.isFile === true
}

export const isFileInfo = (obj: any): obj is FileInfo => {
  return isFileHeader(obj)
    && isCID((obj as any).userland)
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
