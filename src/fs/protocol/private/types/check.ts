import { isNum, isObject, isString } from '../../../../common'
import * as check  from '../../../types/check'
import { PrivateFile, PrivateDirectory, PrivateLink, PrivateChildren, DecryptedNode, PrivateSkeletonInfo, PrivateSkeleton } from '../types'

export const isDecryptedNode = (obj: any): obj is DecryptedNode => {
  return isPrivateDirectory(obj) || isPrivateFile(obj)
}

export const isPrivateFile = (obj: any): obj is PrivateFile => {
  return isObject(obj)
    && check.isMetadata(obj.metadata)
    && obj.metadata.isFile
    && isString(obj.key)
    && check.isCID(obj.content)
}

export const isPrivateDirectory = (obj: any): obj is PrivateDirectory => {
  return isObject(obj)
    && check.isMetadata(obj.metadata)
    && obj.metadata.isFile === false
    && isNum(obj.revision)
    && isPrivateChildren(obj.children)
    && isPrivateSkeleton(obj.skeleton)
}

export const isPrivateLink = (obj: any): obj is PrivateLink => {
  return isObject(obj)
    && isString(obj.key)
    && check.isLink(obj)
}

export const isPrivateChildren = (obj: any): obj is PrivateChildren => {
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
    && isPrivateSkeleton(obj.children)
}
