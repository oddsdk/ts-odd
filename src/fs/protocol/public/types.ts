import { Metadata } from '../../metadata'
import { AddResult, CID } from '../../../ipfs'

export type PutDetails = AddResult & {
  userland: CID
  metadata: CID
  isFile: boolean
  skeleton: Skeleton
}

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
  previous?: CID
  skeleton: Skeleton
}

export type TreeInfo = TreeHeader & {
  userland: CID
}

export type FileHeader = {
  metadata: Metadata
  previous?: CID
}

export type FileInfo = FileHeader & {
  userland: CID
}
