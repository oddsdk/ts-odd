import type { CID } from "multiformats/cid"

export type Codec = string

export type FileContent = Record<string, unknown> | FileContentRaw | Blob | string | number | boolean
export type FileContentRaw = Uint8Array

export type AddResult = {
  cid: CID
  size: number
  isFile: boolean
}
