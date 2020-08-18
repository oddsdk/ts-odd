import { Link, Metadata } from "../../types"
import { AddResult, CID } from "../../../ipfs"

export type DecryptedNode = PrivateFileInfo | PrivateTreeInfo

export type PrivateFileInfo = {
  content: CID
  metadata: Metadata
  bareNameFilter: BareNameFilter
  revision: number
  key: AESKey
}

// a hashed name filter
export type PrivateName = string

// a name filter with just path elements in it, no revision number
export type BareNameFilter = string

// a name filter with path elements & revision number in it
export type RevisionNameFilter = string

// a name filter with path elements & revision number in it, saturated to ~320 bits
export type SaturatedNameFilter = string

export type AESKey = string

export type PrivateLink = Link & { 
  key: AESKey
}

export type PrivateChildren = { [name: string]: PrivateLink }

export type PrivateTreeInfo = {
  metadata: Metadata
  bareNameFilter: BareNameFilter
  revision: number
  children: PrivateChildren
  skeleton: PrivateSkeleton
}

export type PrivateSkeleton = { [name: string]: PrivateSkeletonInfo}

export type PrivateSkeletonInfo = {
  cid: CID
  key: AESKey
  children: PrivateSkeleton
}

export type LockedSubtree = {
  name: PrivateName
  key: AESKey
}

export type NamedAddResult = AddResult & {
  name: PrivateName
}

export type Revision = {
  cid: CID
  name: PrivateName
}
