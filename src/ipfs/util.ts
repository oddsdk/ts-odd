import dagPB from 'ipld-dag-pb'
import { DAGNode, RawDAGNode, DAGLink, RawDAGLink } from './types'


export const rawToDAGLink = (raw: RawDAGLink): DAGLink => {
  return new dagPB.DAGLink(raw.Name, raw.Tsize, raw.Hash)
}

export const rawToDAGNode = (raw: RawDAGNode): DAGNode => {
  const data = raw?.value?.Data
  const links = raw?.value?.Links?.map(rawToDAGLink)
  return new dagPB.DAGNode(data, links)
}


export default {
  rawToDAGLink,
  rawToDAGNode
}
