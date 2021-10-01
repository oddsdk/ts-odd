import { SymmAlg } from "keystore-idb/lib/types.js"

import { BaseLink } from "../../types.js"
import { Metadata } from "../../metadata.js"
import { AddResult, CID } from "../../../ipfs/index.js"
import { BareNameFilter, PrivateName } from "./namefilter.js"

export type DecryptedNode = PrivateFileInfo | PrivateTreeInfo

export type PrivateFileInfo = {
  content: CID
  metadata: Metadata
  bareNameFilter: BareNameFilter
  revision: number
  key: string
  algorithm?: SymmAlg
}

export type PrivateLink = BaseLink & {
  key: string
  algorithm?: SymmAlg
  pointer: PrivateName
}

export type PrivateLinks = { [name: string]: PrivateLink }

export type PrivateTreeInfo = {
  metadata: Metadata
  bareNameFilter: BareNameFilter
  revision: number
  links: PrivateLinks
  skeleton: PrivateSkeleton
}

export type PrivateSkeleton = { [name: string]: PrivateSkeletonInfo}

export type PrivateSkeletonInfo = {
  cid: CID
  key: string
  algorithm?: SymmAlg
  subSkeleton: PrivateSkeleton
}

export type PrivateAddResult = AddResult & {
  name: PrivateName
  key: string
  algorithm?: SymmAlg
  skeleton: PrivateSkeleton
}

export type Revision = {
  cid: CID
  name: PrivateName
  number: number
}
