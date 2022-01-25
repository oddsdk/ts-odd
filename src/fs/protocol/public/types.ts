import type { CID } from "multiformats/cid"

import { Metadata } from "../../metadata.js"
import { AddResult } from "../../../ipfs/index.js"
import { SoftLink } from "../../types.js"


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

export type Skeleton = { [name: string]: SkeletonInfo | SoftLink }

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
