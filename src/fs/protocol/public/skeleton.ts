import { Skeleton, SkeletonInfo } from "./types"
import { NonEmptyPath } from '../../types'
import * as pathUtil from '../../path'

export const getPath = (skeleton: Skeleton, path: NonEmptyPath): SkeletonInfo | null => {
  const head = path[0]
  const child = skeleton[head] || null
  const nextPath = pathUtil.nextNonEmpty(path)
  if(child === null || nextPath === null) {
    return child
  }else {
    return getPath(child.subSkeleton, nextPath)
  }
}
