import { BlockCodec } from "multiformats/codecs/interface"
import { CID } from "multiformats/cid"
import { IPFSEntry } from "ipfs-core-types/src/root"


export type Implementation = {
  // Get the data behind a CID
  getBlock: (cid: CID) => Promise<Uint8Array>
  getUnixFile: (cid: CID) => Promise<Uint8Array>
  getUnixDirectory: (cid: CID) => Promise<IPFSEntry[]>

  // Keep data around
  putBlock: (data: Uint8Array, codec: BlockCodec<number, unknown>) => Promise<CID>
  putChunked: (data: Uint8Array) => Promise<PutResult>
}

export type PutResult = {
  cid: CID
  size: number
  isFile: boolean
}