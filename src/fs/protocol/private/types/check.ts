import { isNum, isObject, isString, isDefined } from "../../../../common/index.js"
import * as check  from "../../../types/check.js"
import { PrivateFileInfo, PrivateTreeInfo, PrivateLink, PrivateLinks, DecryptedNode, PrivateSkeletonInfo, PrivateSkeleton } from "../types.js"

export const isDecryptedNode = (obj: any): obj is DecryptedNode => {
  return isPrivateTreeInfo(obj) || isPrivateFileInfo(obj)
}

export const isPrivateFileInfo = (obj: any): obj is PrivateFileInfo => {
  return isObject(obj)
    && check.isMetadata(obj.metadata)
    && obj.metadata.isFile
    && isString(obj.key)
    && (!isDefined(obj.algorithm) || isString(obj.algorithm))
    && check.isCID(obj.content)
}

export const isPrivateTreeInfo = (obj: any): obj is PrivateTreeInfo => {
  return isObject(obj)
    && check.isMetadata(obj.metadata)
    && obj.metadata.isFile === false
    && isNum(obj.revision)
    && isPrivateLinks(obj.links)
    && isPrivateSkeleton(obj.skeleton)
}

export const isPrivateLink = (obj: any): obj is PrivateLink => {
  return isObject(obj)
    && check.isBaseLink(obj)
    && isString(obj.key)
    && isString(obj.pointer)
    && (!isDefined(obj.algorithm) || isString(obj.algorithm))
}

export const isPrivateLinks = (obj: any): obj is PrivateLinks => {
  return isObject(obj)
    && Object.values(obj).every(isPrivateLink)
}

export const isPrivateSkeleton = (obj: any): obj is PrivateSkeleton => {
  return isObject(obj)
    && Object.values(obj).every(isPrivateSkeletonInfo)
}

export const isPrivateSkeletonInfo = (obj: any): obj is PrivateSkeletonInfo => {
  return isObject(obj)
    && check.isCID(obj.cid)
    && isString(obj.key)
    && (!isDefined(obj.algorithm) || isString(obj.algorithm))
    && isPrivateSkeleton(obj.subSkeleton)
}
