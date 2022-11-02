import { BlockCodec } from "multiformats/codecs/interface"
import { CID } from "multiformats/cid"


export type Implementation = {
  // Get the data behind a CID
  getBlock: (cid: CID) => Promise<Uint8Array>
  getUnixFile: (cid: CID) => Promise<Uint8Array>
  getUnixDirectory: (cid: CID) => Promise<DirectoryItem[]>

  // Keep data around
  putBlock: (data: Uint8Array, codec: BlockCodec<number, unknown>) => Promise<CID>
  putChunked: (data: Uint8Array) => Promise<PutResult>

  // Stats
  size: (cid: CID) => Promise<number>
}

export type DirectoryItem = {
  isFile: boolean
  cid: CID
  name: string
  size: number
}

export type PutResult = {
  cid: CID
  size: number
  isFile: boolean
}