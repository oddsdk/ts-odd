import dagPB from 'ipld-dag-pb'
import file from './file'
import { encryptDAGNode, encryptContent } from './private'
import { AddLinkOpts } from './types'
import { getIpfs, DAGNode, DAGLink, CID, RawDAGNode, RawDAGLink, FileContent } from '../ipfs'

export function emptyDir(): DAGNode {
  return new dagPB.DAGNode(Buffer.from([8, 1]))
}

export async function emptyDirCID(): Promise<CID> {
  const node = await emptyDir()
  return putDAGNode(node)
}

export async function addLink(parent: CID, link: DAGLink, opts: AddLinkOpts = {}): Promise<CID> {
  return addNestedLink(parent, "", link, opts)
}

export async function addNestedLink(parent: CID, folderPath: string, link: DAGLink, opts: AddLinkOpts = {}): Promise<CID> {
  return addNestedLinkRecurse(parent, splitPath(folderPath), link, opts)
}

export async function addNestedLinkRecurse(parentID: CID, path: string[], link: DAGLink, opts: AddLinkOpts = {}): Promise<CID> {
  const { shouldOverwrite = true, symmKey } = opts
  const parent = await resolveDAGNode(parentID)
  let toAdd
  if(path.length === 0){
    // if link exists & non-destructive, then do nothing
    if(findLink(parent, link.Name) !== undefined && !shouldOverwrite){
      return parentID
    }
    toAdd = link
  }else{
    const childLink = findLink(parent, path[0])
    let childCID
    if(childLink){
      childCID = childLink.Hash.toString()
    }else {
      childCID = await emptyDirCID()
    }
    const updatedCID = await addNestedLinkRecurse(childCID, path.slice(1), link)
    toAdd = await cidToDAGLink(updatedCID, path[0])
  }
  parent.rmLink(toAdd.Name)
  parent.addLink(toAdd)
  return putObj(parent, symmKey)
}

export async function cidToDAGLink(cid: CID, name: string): Promise<DAGLink> {
  const ipfs = await getIpfs()
  const stat = await ipfs.object.stat(cid)
  return new dagPB.DAGLink(name, stat.CumulativeSize, cid)
}

export async function nodeToDAGLink(node: DAGNode, name: string): Promise<DAGLink> {
  const cid = await toHash(node)
  return new dagPB.DAGLink(name, node.size, cid)
}

export function rawToDAGLink(raw: RawDAGLink): DAGLink {
  return new dagPB.DAGLink(raw._name, raw._size, raw._cid)
}

export function rawToDAGNode(raw: RawDAGNode): DAGNode {
  const data = raw?.value?._data
  const links = raw?.value?._links?.map(rawToDAGLink)
  return new dagPB.DAGNode(data, links)
}

export async function resolveDAGNode(node: CID | DAGNode): Promise<DAGNode> {
  const ipfs = await getIpfs()
  if(typeof node === 'string'){
    const raw = await ipfs.dag.get(node)
    return rawToDAGNode(raw)
  }else{
    return node
  }
}

export async function putObj(node: DAGNode | FileContent, symmKey?: string): Promise<CID> {
  if(node instanceof dagPB.DAGNode) {
    if(symmKey === undefined) {
      return putDAGNode(node as DAGNode)
    }else{
      const encrypted = await encryptDAGNode(node as DAGNode, symmKey)
      return file.add(encrypted) 
    }
  } else {
    if(symmKey === undefined) {
      return file.add(node)
    } else{
      const encrypted = await encryptContent(node, symmKey)
      return file.add(encrypted)
    }
  }
}

export async function putDAGNode(node: DAGNode): Promise<CID> { 
  const ipfs = await getIpfs()
  // using this format so that we get v0 CIDs. ipfs gateway seems to have issues w/ v1 CIDs
  const cid = await ipfs.dag.put(node, { format: 'dag-pb', hashAlg: 'sha2-256' })
  return cid.toString()
}

export function findLink(node: DAGNode, name: string): DAGLink | undefined {
  return node?.Links?.find((link: DAGLink) => link.Name === name)
}

export async function toHash(node: DAGNode): Promise<CID> {
  // @@TODO: investigate a better way to do this?
  // this basically just re-serializes an obj if it's already in the cache, which isn't bad
  return putDAGNode(node)
}

export function splitPath(path: string): string[] {
  return path.split('/').filter(p => p.length > 0)
}

export default {
  emptyDir,
  addLink,
  addNestedLink,
  addNestedLinkRecurse,
  cidToDAGLink,
  nodeToDAGLink,
  rawToDAGLink,
  rawToDAGNode,
  resolveDAGNode,
  putDAGNode,
  findLink,
  toHash,
  splitPath,
}
