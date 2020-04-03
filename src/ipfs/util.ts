import dagPB from 'ipld-dag-pb'
import { DAGNode, RawDAGNode, DAGLink, RawDAGLink } from './types'

export const rawToDAGLink = (raw: RawDAGLink): DAGLink => {
  return new dagPB.DAGLink(raw._name, raw._size, raw._cid)
}

export const rawToDAGNode = (raw: RawDAGNode): DAGNode => {
  const data = raw?.value?._data
  const links = raw?.value?._links?.map(rawToDAGLink)
  return new dagPB.DAGNode(data, links)
}


export default {
  rawToDAGLink,
  rawToDAGNode
}
