import type { CID } from "multiformats/cid"

import { BareNameFilter, PrivateName } from "./namefilter.js"
import { BaseLink, SoftLink } from "../../types.js"
import { Metadata } from "../../metadata.js"
import { PutResult } from "../../../components/depot/implementation.js"


export type DecryptedNode = PrivateFileInfo | PrivateTreeInfo

export type PrivateFileInfo = {
  content: string
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
  cid: string
  key: string
  subSkeleton: PrivateSkeleton
}

export type PrivateAddResult = PutResult & {
  name: PrivateName
  key: Uint8Array
  skeleton: PrivateSkeleton
}

export type Revision = {
  cid: CID | string
  name: PrivateName
  number: number
}
