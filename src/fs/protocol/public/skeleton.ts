import { Skeleton, SkeletonInfo } from "./types.js"
import { NonEmptyPath, SoftLink } from "../../types.js"
import { isSoftLink } from "../../types/check.js"


export const getPath = (skeleton: Skeleton, path: NonEmptyPath): SkeletonInfo | SoftLink | null => {
  const head = path[0]
  const child = skeleton[head] || null
  const nextPath = nextNonEmpty(path)
  if (child === null || nextPath === null || isSoftLink(child)) {
    return child
  } else if (child.subSkeleton) {
    return getPath(child.subSkeleton, nextPath)
  } else {
    return null
  }
}

export function nextNonEmpty(parts: NonEmptyPath): NonEmptyPath | null {
  const next = parts.slice(1)
  if (next.length < 1) {
    return null
  }
  return next as NonEmptyPath
}
