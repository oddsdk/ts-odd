import type { CID } from "multiformats/cid"

import { Metadata } from "../../metadata.js"
import { PutResult } from "../../../components/depot/implementation.js"
import { SoftLink } from "../../types.js"


export type PutDetails = PutResult & {
  userland: CID
  metadata: CID
  isFile: boolean
  skeleton: Skeleton
}

export type SkeletonInfo = {
  cid: CID | string
  userland: CID | string
  metadata: CID | string
  subSkeleton: Skeleton
  isFile: boolean
}

export type Skeleton = { [ name: string ]: SkeletonInfo | SoftLink }

export type TreeHeader = {
  metadata: Metadata
  previous?: CID | string
  skeleton: Skeleton
}

export type TreeInfo = TreeHeader & {
  userland: CID | string
}

export type FileHeader = {
  metadata: Metadata
  previous?: CID | string
}

export type FileInfo = FileHeader & {
  userland: CID | string
}
