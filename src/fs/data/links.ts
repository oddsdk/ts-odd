import { CID } from "multiformats/cid"
import * as dagPB from "@ipld/dag-pb"

import { DAG_NODE_DATA } from "../../ipfs/constants.js"
import { OperationContext } from "./public/publicNode.js"



export async function linksToCID(links: Record<string, CID>, { getBlock, putBlock, signal }: OperationContext): Promise<CID> {
  const Links: dagPB.PBLink[] = []

  for (const [Name, cid] of Object.entries(links)) {
    // TODO: We can Probably use Promise.all here to make this concurrent.
    const stat = await ipfs.files.stat(cid, { signal })
    // TODO: This should actually be equivalent to: (await ipfs.dag.get(cid, { signal })).value.Size
    // FIXME: Write a size cache. .stat calls take ~2ms in the median. We'll duplicate a lot of these calls
    Links.push({
      Name,
      Tsize: stat.cumulativeSize,
      Hash: cid
    })
  }

  const bytes = dagPB.encode(dagPB.prepare({
    Data: DAG_NODE_DATA,
    Links
  }))

  // TODO for the switch towards a BlockStore abstraction
  // const hash = await sha256.digest(bytes)
  // const cid = CID.create(1, dagPB.code, hash)

  return await ipfs.block.put(bytes, { version: 1, format: "dag-pb", mhtype: "sha2-256", pin: false, signal })
}



export async function linksFromCID(cid: CID, ctx: OperationContext): Promise<Record<string, CID>> {
  const bytes = await ctx.getBlock(cid, ctx)
  const dagNode = dagPB.decode(bytes)
  const links: Record<string, CID> = {}
  for (const dagLink of dagNode.Links || []) {
    links[dagLink.Name || ""] = dagLink.Hash
  }
  return Object.freeze(links)
}


//--------------------------------------
// Utilities
//--------------------------------------

// TODO Unused for now. At some point maybe experiment with mapRecordPar

export async function mapRecord<S, T>(record: Record<string, S>, f: (key: string, value: S) => Promise<T>): Promise<Record<string, T>> {
  const newRecord: Record<string, T> = {}
  for (const [key, value] of Object.entries(record)) {
    newRecord[key] = await f(key, value)
  }
  return newRecord
}

export function mapRecordSync<S, T>(record: Record<string, S>, f: (key: string, value: S) => T): Record<string, T> {
  const newRecord: Record<string, T> = {}
  for (const [key, value] of Object.entries(record)) {
    newRecord[key] = f(key, value)
  }
  return newRecord
}

export async function mapRecordPar<S, T>(record: Record<string, S>, f: (key: string, value: S) => Promise<T>): Promise<Record<string, T>> {
  const newRecord: Record<string, T> = {}
  await Promise.all(Object.entries(record).map(([key, value]) => f(key, value).then(result => newRecord[key] = result)))
  return newRecord
}
