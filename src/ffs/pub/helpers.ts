import dagPB from 'ipld-dag-pb'
import { getIpfs, CID, DAGNode, RawDAGNode, DAGLink, RawDAGLink } from '../../ipfs'
import { Link } from '../types'
import { Buffer } from 'buffer/'

export function emptyDir(): DAGNode {
  return new dagPB.DAGNode(Buffer.from([8, 1]))
}

export function rawToDAGLink(raw: RawDAGLink): DAGLink {
  return new dagPB.DAGLink(raw._name, raw._size, raw._cid)
}

export function rawToDAGNode(raw: RawDAGNode): DAGNode {
  const data = raw?.value?._data
  const links = raw?.value?._links?.map(rawToDAGLink)
  return new dagPB.DAGNode(data, links)
}

export function toDAGLink(link: Link): DAGLink {
  const { name, cid, size } = link
  return new dagPB.DAGLink(name, size, cid)
}

export function toLink(dagLink: DAGLink): Link {
  const { Name, Hash, Size } = dagLink
  return {
    name: Name,
    cid: Hash.toString(),
    size: Size
  }
}

export async function putDAGNode(node: DAGNode): Promise<CID> { 
  const ipfs = await getIpfs()
  // using this format so that we get v0 CIDs. ipfs gateway seems to have issues w/ v1 CIDs
  const cid = await ipfs.dag.put(node, { format: 'dag-pb', hashAlg: 'sha2-256' })
  return cid.toString()
}

export default {
  emptyDir,
  rawToDAGLink,
  rawToDAGNode,
  toDAGLink,
  toLink,
  putDAGNode
}
