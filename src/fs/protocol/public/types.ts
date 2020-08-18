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

export type LocalTreeInfo = {
  metadata: Metadata
  skeleton: Skeleton
  children: ChildrenMetadata
}

export type TreeInfo = LocalTreeInfo & {
  userland: CID
}

export type LocalFileInfo = {
  metadata: Metadata
}

export type FileInfo = LocalFileInfo & {
  userland: CID
}

