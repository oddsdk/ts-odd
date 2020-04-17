import dagPB from 'ipld-dag-pb'
import config from './config'
import { CID, FileContent, DAGNode, UnixFSFile, DAGLink } from './types'
import util from './util'
import { DAG_NODE_DATA } from './constants'

export const add = async (content: FileContent): Promise<CID> => {
  const ipfs = await config.getIpfs()
  const chunks = []
  for await (const chunk of ipfs.add(content)){
    chunks.push(chunk)
  }
  // return cid of last object (root)
  return chunks[chunks.length - 1].cid.toString()
}

export const catRaw = async (cid: CID): Promise<Buffer[]> => {
  const ipfs = await config.getIpfs()
  const chunks = []
  for await (const chunk of ipfs.cat(cid)){
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
  const ipfs = await config.getIpfs()
  const links = []
  for await (const link of ipfs.ls(cid)) {
    links.push(link)
  }
  return links
}

export const dagGet = async (cid: CID): Promise<DAGNode> => {
  const ipfs = await config.getIpfs()
  const raw = await ipfs.dag.get(cid)
  return util.rawToDAGNode(raw)
}

export const dagPut = async (node: DAGNode): Promise<CID> => {
  const ipfs = await config.getIpfs()
  // using this format so that we get v0 CIDs. ipfs gateway seems to have issues w/ v1 CIDs
  const cid = await ipfs.dag.put(node, { format: 'dag-pb', hashAlg: 'sha2-256' })
  return cid.toString()
}

export const dagPutLinks = async (links: DAGLink[]): Promise<CID> => {
  const node = new dagPB.DAGNode(DAG_NODE_DATA, links)
  return dagPut(node)
}

export const dns = async (domain: string): Promise<CID> => {
  const ipfs = await config.getIpfs()
  return ipfs.dns(domain)
}

export default {
  add,
  catRaw,
  catBuf,
  cat,
  ls,
  dagGet,
  dagPut,
  dagPutLinks,
  dns,
}
