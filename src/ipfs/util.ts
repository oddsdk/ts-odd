import dagPb, { DAGLink, DAGNode } from 'ipld-dag-pb'
import type { GetResult } from 'ipfs-core-types/src/dag'
import { CID } from 'ipfs-message-port-client/src/block'

type RawDAGLink = {
  Name: string
  Hash: CID
  Tsize: number
}

const rawToDAGLink = (raw: RawDAGLink): DAGLink => {
  return new dagPb.DAGLink(raw.Name, raw.Tsize, raw.Hash)
}

export const rawToDAGNode = (raw: GetResult): DAGNode => {
  const data = raw?.value?.Data
  const links = raw?.value?.Links?.map(rawToDAGLink)
  return new dagPb.DAGNode(data, links)
}
