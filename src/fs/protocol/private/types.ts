import type { CID } from "multiformats/cid"

import { BaseLink, SoftLink } from "../../types.js"
import { Metadata } from "../../metadata.js"
import { BareNameFilter, PrivateName } from "./namefilter.js"


export type DecryptedNode = PrivateFileInfo | PrivateTreeInfo

export type PrivateFileInfo = {
  content: CID | string
  metadata: Metadata
  bareNameFilter: BareNameFilter
  revision: number
  key: string
}

export type PrivateLink = BaseLink & {
  key: string
  pointer: PrivateName
}

export type PrivateLinks = { [ name: string ]: PrivateLink | SoftLink }

export type PrivateTreeInfo = {
  metadata: Metadata
  bareNameFilter: BareNameFilter
  revision: number
  links: PrivateLinks
  skeleton: PrivateSkeleton
}

export type PrivateSkeleton = { [ name: string ]: PrivateSkeletonInfo | SoftLink }

export type PrivateSkeletonInfo = {
  cid: CID | string
  key: string
  subSkeleton: PrivateSkeleton
}

export type PrivateAddResult = AddResult & {
  name: PrivateName
  key: string
  skeleton: PrivateSkeleton
}

export type Revision = {
  cid: CID | string
  name: PrivateName
  number: number
}
