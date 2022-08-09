import type { CID } from "multiformats/cid"
import type { IPFS } from "ipfs-core-types"
import type { Options } from "ipfs-core/types"

export type Codec = string

export type FileContent = Record<string, unknown> | FileContentRaw | Blob | string | number | boolean
export type FileContentRaw = Uint8Array

export type AddResult = {
  cid: CID
  size: number
  isFile: boolean
}

export type IPFSPackage = {
  create: (options?: Options) => IPFS
}
