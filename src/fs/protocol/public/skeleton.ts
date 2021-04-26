import { Skeleton, SkeletonInfo } from "./types"
import { NonEmptyPath } from '../../types'
import * as pathUtil from '../../path'


export const getPath = (skeleton: Skeleton, path: NonEmptyPath): SkeletonInfo | null => {
  const head = path[0]
  const child = skeleton[head] || null
  const nextPath = nextNonEmpty(path)
  if(child === null || nextPath === null) {
    return child
  }else {
    return getPath(child.subSkeleton, nextPath)
  }
}


function nextNonEmpty(parts: NonEmptyPath): NonEmptyPath | null {
  const next = parts.slice(1)
  if (next.length < 1) {
    return null
  }
  return next as NonEmptyPath
}
