import { CID } from "multiformats/cid"

import { isString, isObject, isNum, isBool } from "../../common/index.js"
import { Tree, File, HardLink, SoftLink, Links, BaseLink, SimpleLink } from "../types.js"
import { Skeleton, SkeletonInfo, TreeInfo, FileInfo, TreeHeader, FileHeader } from "../protocol/public/types.js"
import { SemVer } from "../versions.js"
import { Metadata, UnixMeta } from "../metadata.js"


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

export const isSimpleLink = (obj: any): obj is SimpleLink => {
  return isObject(obj)
    && isString(obj.name)
    && isNum(obj.size)
    && isCID(obj.cid)
}

export const isSoftLink = (obj: any): obj is SoftLink => {
  return isObject(obj)
    && isString(obj.name)
    && isString(obj.ipns)
}

export const isSoftLinkDictionary = (obj: any): obj is Record<string, SoftLink> => {
  if (isObject(obj)) {
    const values = Object.values(obj)
    return values.length > 0 && values.every(isSoftLink)
  }

  return false
}

export const isSoftLinkList = (obj: any): obj is Array<SoftLink> => {
  return Array.isArray(obj) && obj.every(isSoftLink)
}

export const isHardLink = (obj: any): obj is HardLink => {
  return isBaseLink(obj) && isCID((obj as any).cid)
}

export const isLinks = (obj: any): obj is Links => {
  return isObject(obj)
    && Object.values(obj).every(a => isHardLink(a) || isSoftLink(a))
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
  return isObject(obj) && Object.values(obj).every(isSkeletonInfo)
}

export const isSkeletonInfo = (val: any): val is SkeletonInfo => {
  const isNode = isObject(val)
    && isCID(val.cid)
    && isCID(val.userland)
    && isCID(val.metadata)
    && isSkeleton(val.subSkeleton)

  return isNode || isSoftLink(val)
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

export const isCID = (obj: any): obj is CID | string => {
  const cid = CID.asCID(obj)
  return !!cid || isString(obj) || (obj && "code" in obj && "version" in obj && ("multihash" in obj || "hash" in obj))
}

export const isSemVer = (obj: any): obj is SemVer => {
  if (!isObject(obj)) return false
  const { major, minor, patch } = obj
  return isNum(major) && isNum(minor) && isNum(patch)
}
