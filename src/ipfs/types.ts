import type { CID as MultiformatsCID } from "multiformats/cid"

export type CID = MultiformatsCID
export type Codec = string

export type FileContent = Record<string, unknown> | FileContentRaw | Blob | string | number | boolean
export type FileContentRaw = Uint8Array

export type AddResult = {
  cid: CID
  size: number
  isFile: boolean
}
