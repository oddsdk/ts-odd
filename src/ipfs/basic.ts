import { getIpfs } from './config'
import { CID, FileContent, DAGNode, UnixFSFile } from './types'
import util from './util'

export async function add(content: FileContent): Promise<CID> {
  const ipfs = await getIpfs()
  const chunks = []
  for await (const chunk of ipfs.add(content)){
    chunks.push(chunk)
  }
  // return cid of last object (root)
  return chunks[chunks.length - 1].cid.toString()
}

export async function catRaw(cid: CID): Promise<Buffer[]> {
  const ipfs = await getIpfs()
  const chunks = []
  for await (const chunk of ipfs.cat(cid)){
    chunks.push(chunk)
  }
  return chunks
}

export async function catBuf(cid: CID): Promise<Buffer> {
  const raw = await catRaw(cid)
  return Buffer.concat(raw)
}

export async function cat(cid: CID): Promise<string> {
  const buf = await catBuf(cid)
  return buf.toString()
}

export async function ls(cid: CID): Promise<UnixFSFile[]> {
  const ipfs = await getIpfs()
  const links = []
  for await (const link of ipfs.ls(cid)) {
    links.push(link)
  }
  return links
}

export async function dagGet(cid: CID): Promise<DAGNode> {
  const ipfs = await getIpfs()
  const raw = await ipfs.dag.get(cid)
  return util.rawToDAGNode(raw)
}

export async function dagPut(node: DAGNode): Promise<CID> {
  const ipfs = await getIpfs()
  // using this format so that we get v0 CIDs. ipfs gateway seems to have issues w/ v1 CIDs
  const cid = await ipfs.dag.put(node, { format: 'dag-pb', hashAlg: 'sha2-256' })
  return cid.toString()
}

export default {
  add,
  catRaw,
  catBuf,
  cat,
  ls,
  dagGet,
  dagPut
}
