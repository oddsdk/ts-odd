import { addNestedLink, cidToDAGLink } from './helpers'
import { getIpfs, CID, FileContent } from '../ipfs'

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
  return addNestedLink(root, folderPath, link, true)
}

export async function catRaw(cid: CID): Promise<Uint8Array[]> {
  const ipfs = await getIpfs()
  const chunks = []
  for await (const chunk of ipfs.cat(cid)){
    chunks.push(chunk)
  }
  return chunks
}

export async function catBuf(cid: CID): Promise<Uint8Array> {
  const raw = await catRaw(cid)
  return Buffer.concat(raw)
}

export async function cat(cid: CID): Promise<string> {
  const buf = await catBuf(cid)
  return buf.toString()
}

export default {
  add,
  addToFolder,
  catRaw,
  catBuf,
  cat,
}
