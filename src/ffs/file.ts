import dagPB from 'ipld-dag-pb'
import { addNestedLink, toHash } from './helpers'
import { getIpfs, DAGLink, CID, FileContent } from '../ipfs'

export async function add(content: FileContent): Promise<CID> {
  const ipfs = await getIpfs()
  const chunks = []
  for await (const chunk of ipfs.add(content)){
    chunks.push(chunk)
  }
  // return cid of last object (root)
  return chunks[chunks.length - 1].cid.toString()
}

export async function addToFolder(content: FileContent, filename: string, root: CID, folderPath: string = ''): Promise<CID> {
  const fileCID = await add(content)
  const link = await cidToDAGLink(fileCID, filename)
  const updated = await addNestedLink(root, folderPath, link, true)
  return toHash(updated)
}

export async function catRaw(cid: CID): Promise<Uint8Array[]> {
  const ipfs = await getIpfs()
  const chunks = []
  for await (const chunk of ipfs.cat(cid)){
    chunks.push(chunk)
  }
  return chunks
}

export async function cat(cid: CID): Promise<string> {
  const raw = await catRaw(cid)
  return Buffer.concat(raw).toString()
}

export async function cidToDAGLink(cid: CID, name: string): Promise<DAGLink> {
  const ipfs = await getIpfs()
  const stat = await ipfs.object.stat(cid)
  return new dagPB.DAGLink(name, stat.CumulativeSize, cid)
}

export default {
  add,
  addToFolder,
  catRaw,
  cat,
  cidToDAGLink,
}
