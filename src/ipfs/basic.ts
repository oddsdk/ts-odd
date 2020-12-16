import CIDObj from 'cids'
import dagPB from 'ipld-dag-pb'

import { get as getIpfs } from './config'
import { CID, FileContent, DAGNode, UnixFSFile, DAGLink, AddResult } from './types'
import util from './util'
import { DAG_NODE_DATA } from './constants'


export const add = async (content: FileContent): Promise<AddResult> => {
  const ipfs = await getIpfs()
  const result = await ipfs.add(content, { cidVersion: 1 })

  return {
    cid: result.cid.toString(),
    size: result.size,
    isFile: true
  }
}

export const catRaw = async (cid: CID): Promise<Buffer[]> => {
  const ipfs = await getIpfs()
  const chunks = []
  await attemptPin(cid)
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
  await attemptPin(cid)
  const raw = await ipfs.dag.get(new CIDObj(cid))
  const node = util.rawToDAGNode(raw)
  return node
}

export const dagPut = async (node: DAGNode): Promise<AddResult> => {
  const ipfs = await getIpfs()
  // using this format because Gateway doesn't like `dag-cbor` nodes.
  // I think this is because UnixFS requires `dag-pb` & the gateway requires UnixFS for directory traversal
  const cidObj = await ipfs.dag.put(node, { format: 'dag-pb', hashAlg: 'sha2-256' })
  const cid = cidObj.toV1().toString()
  const nodeSize = await size(cid)
  return {
    cid,
    size: nodeSize,
    isFile: false
  }
}

export const dagPutLinks = async (links: DAGLink[]): Promise<AddResult> => {
  const node = new dagPB.DAGNode(DAG_NODE_DATA, links)
  return dagPut(node)
}

export const size = async (cid: CID): Promise<number> => {
  const ipfs = await getIpfs()
  const stat = await ipfs.files.stat(`/ipfs/${cid}`)
  return stat.cumulativeSize
}

export const reconnect = async (): Promise<void> => {
  await getIpfs()
}

export const attemptPin = async (cid: CID): Promise<void> => {
  const ipfs = await getIpfs()
  try {
    await ipfs.pin.add(cid, { recursive: false })
  }catch(_err) {
    // don't worry about failed pins
  }
}
