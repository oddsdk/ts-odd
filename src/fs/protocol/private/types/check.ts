import { isNum, isObject, isString } from '../../../../common'
import * as check  from '../../../types/check'
import { PrivateFileInfo, PrivateTreeInfo, PrivateLink, PrivateLinks, DecryptedNode, PrivateSkeletonInfo, PrivateSkeleton } from '../types'

export const isDecryptedNode = (obj: any): obj is DecryptedNode => {
  return isPrivateTreeInfo(obj) || isPrivateFileInfo(obj)
}

export const isPrivateFileInfo = (obj: any): obj is PrivateFileInfo => {
  return isObject(obj)
    && check.isMetadata(obj.metadata)
    && obj.metadata.isFile
    && isString(obj.key)
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
  return check.isBaseLink(obj)
    && isString((obj as any).key)
    && isString((obj as any).pointer)
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
    && isPrivateSkeleton(obj.subSkeleton)
}
