import { CID } from "multiformats/cid"
import dagPb, { DAGLink, DAGNode } from "ipld-dag-pb"
import type { GetResult } from "ipfs-core-types/src/dag"
import OldCID from "cids"

type RawDAGLink = {
  Name: string
  Hash: CID
  Tsize: number
}

const rawToDAGLink = (raw: RawDAGLink): DAGLink => {
  const h = raw.Hash
  const c = new OldCID(h.version, h.code, h.multihash.bytes)
  return new dagPb.DAGLink(raw.Name, raw.Tsize, c)
}

export const rawToDAGNode = (raw: GetResult): DAGNode => {
  const data = raw?.value?.Data
  const links = raw?.value?.Links?.map(rawToDAGLink)
  return new dagPb.DAGNode(data, links)
}
