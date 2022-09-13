import { CID } from "multiformats/cid"
import { IPFSEntry } from "ipfs-core-types/src/root"
import * as uint8arrays from "uint8arrays"

import { Implementation, AddResult } from "../implementation.js"
import * as Ipfs from "./ipfs/index.js"



// 🛳


export async function implementation(peersUrl: string): Promise<Implementation> {
  const ipfs = await Ipfs.nodeWithPkg(
    await Ipfs.pkgFromCDN(Ipfs.DEFAULT_CDN_URL),
    peersUrl,
    false
  )

  return {
    getBlock: async (cid: CID): Promise<Uint8Array> => {
      return ipfs.block.get(cid)
    },
    getUnixDirectory: async (cid: CID): Promise<IPFSEntry[]> => {
      const entries = []

      for await (const entry of ipfs.ls(cid)) {
        entries.push(entry)
      }

      return entries
    },
    getUnixFile: async (cid: CID): Promise<Uint8Array> => {
      const chunks = []

      for await (const chunk of ipfs.cat(cid)) {
        chunks.push(chunk)
      }

      return uint8arrays.concat(chunks)
    },
    add: async (data: Uint8Array): Promise<AddResult> => {
      const addResult = await ipfs.add(data)
      return { ...addResult, isFile: true }
    },
  }
}