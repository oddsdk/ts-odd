import dagPB from 'ipld-dag-pb'
import { get as getIpfs, PEER_WSS } from './config'
import { CID, FileContent, DAGNode, UnixFSFile, DAGLink, AddResult } from './types'
import util from './util'
import { DAG_NODE_DATA } from './constants'


export const add = async (content: FileContent): Promise<AddResult> => {
  const ipfs = await getIpfs()
  const result = await ipfs.add(content)

  return {
    cid: result.cid.toString(),
    size: result.size
  }
}

export const catRaw = async (cid: CID): Promise<Buffer[]> => {
  const ipfs = await getIpfs()
  const chunks = []
  for await (const chunk of ipfs.cat(cid)) {
    chunks.push(chunk)
  }
  return chunks
}

export const catBuf = async (cid: CID): Promise<Buffer> => {
  const raw = await catRaw(cid)
  return Buffer.concat(raw)
}

export const cat = async (cid: CID): Promise<string> => {
  const buf = await catBuf(cid)
  return buf.toString()
}

export const ls = async (cid: CID): Promise<UnixFSFile[]> => {
  const ipfs = await getIpfs()
  const links = []
  for await (const link of ipfs.ls(cid)) {
    links.push(link)
  }
  return links
}

export const dagGet = async (cid: CID): Promise<DAGNode> => {
  const ipfs = await getIpfs()
  const raw = await ipfs.dag.get(cid)
  return util.rawToDAGNode(raw)
}

export const dagPut = async (node: DAGNode): Promise<AddResult> => {
  const ipfs = await getIpfs()
  // using this format so that we get v0 CIDs. ipfs gateway seems to have issues w/ v1 CIDs
  const cidObj = await ipfs.dag.put(node, { format: 'dag-pb', hashAlg: 'sha2-256' })
  const cid = cidObj.toString()
  const nodeSize = await size(cid)
  return { cid, size: nodeSize }
}

export const dagPutLinks = async (links: DAGLink[]): Promise<AddResult> => {
  const node = new dagPB.DAGNode(DAG_NODE_DATA, links)
  return dagPut(node)
}

export const size = async (cid: CID): Promise<number> => {
  const ipfs = await getIpfs()
  const stat = await ipfs.object.stat(cid)
  return stat.CumulativeSize
}

export const reconnect = async (): Promise<void> => {
  const ipfs = await getIpfs()
  await ipfs.swarm.connect(PEER_WSS)
}
