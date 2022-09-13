import { IPFSEntry } from "ipfs-core-types/src/root"
import { CID } from "multiformats/cid"


export type Implementation = {
  // Get the data behind a CID
  getBlock: (cid: CID) => Promise<Uint8Array>
  getUnixFile: (cid: CID) => Promise<Uint8Array>
  getUnixDirectory: (cid: CID) => Promise<IPFSEntry[]>

  // Keep data around
  add: (data: Uint8Array) => Promise<AddResult>
}

export type AddResult = {
  cid: CID
  size: number
  isFile: boolean
}