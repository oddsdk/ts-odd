import { Metadata } from '../../metadata'
import { CID } from '../../../ipfs'

export type ChildrenMetadata = { [name: string]: Metadata }

export type SkeletonInfo = {
  cid: CID
  userland: CID
  metadata: CID
  children: Skeleton
}

export type Skeleton = { [name: string]: SkeletonInfo }

export type TreeInfo = {
  metadata: Metadata
  skeleton: Skeleton
  children: ChildrenMetadata
  userland: CID
}

export type FileInfo = {
  metadata: Metadata
  userland: CID
}

