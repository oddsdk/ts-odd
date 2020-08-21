import { Metadata } from '../../metadata'
import { CID } from '../../../ipfs'

export type ChildrenMetadata = { [name: string]: Metadata }

export type SkeletonInfo = {
  cid: CID
  userland: CID
  metadata: CID
  subSkeleton: Skeleton
  isFile: boolean
}

export type Skeleton = { [name: string]: SkeletonInfo }

export type TreeHeader = {
  metadata: Metadata
  skeleton: Skeleton
}

export type TreeInfo = TreeHeader & {
  userland: CID
}

export type FileHeader = {
  metadata: Metadata
}

export type FileInfo = FileHeader & {
  userland: CID
}

