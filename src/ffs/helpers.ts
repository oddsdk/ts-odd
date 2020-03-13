import dagPB from 'ipld-dag-pb'
import { getIpfs, DAGNode, DAGLink, CID } from '../ipfs'

export async function addFile(file: Blob): Promise<CID> {
  const ipfs = await getIpfs()
  const chunks = []
  for await (const chunk of ipfs.add(file)){
    chunks.push(chunk)
  }
  return chunks[chunks.length - 1].cid.toString()
}

export async function cidToDAGLink(cid: CID, name: string): Promise<DAGLink> {
  const node = await resolveDAGNode(cid)
  return node.toDAGLink({ name })
}

export async function emptyFolder() {
  const node = new dagPB.DAGNode(Buffer.from([8, 1]))
  await putDAGNode(node)
  return node
}

export async function addLink(parent: CID | DAGNode, link: DAGLink, shouldOverwrite: boolean = true): Promise<DAGNode> {
  return addNestedLink(parent, "", link, shouldOverwrite)
}

export async function addNestedLink(parent: CID | DAGNode, folderPath: string, link: DAGLink, shouldOverwrite: boolean = true): Promise<DAGNode> {
  return addNestedLinkRecurse(parent, splitPath(folderPath), link, shouldOverwrite)
}

export async function addNestedLinkRecurse(parentID: CID | DAGNode, path: string[], link: DAGLink, shouldOverwrite: boolean = true): Promise<DAGNode> {
  const parent = await resolveDAGNode(parentID)
  let toAdd
  if(path.length === 0){
    // if link exists & non-destructive, then do nothing
    if(findLink(parent, link.Name) !== undefined && !shouldOverwrite){
      return parent
    }
    toAdd = link
  }else{
    const childLink = findLink(parent, path[0])
    let child
    if(childLink){
      child = await resolveDAGNode(childLink.Hash.toString())
    }else {
      child = await emptyFolder()
    }
    const updated = await addNestedLinkRecurse(child, path.slice(1), link)
    toAdd = await updated.toDAGLink({ name: path[0] })
  }
  parent.rmLink(toAdd.Name)
  parent.addLink(toAdd)
  await putDAGNode(parent)
  return parent
}

export async function resolveDAGNode(node: string | DAGNode): Promise<DAGNode> {
  const ipfs = await getIpfs()
  if(typeof node === 'string'){
    const raw = await ipfs.dag.get(node)
    return new dagPB.DAGNode(raw.value._data, raw.value._links)
  }else{
    return node
  }
}

export async function putDAGNode(node: DAGNode): Promise<CID> { 
  const ipfs = await getIpfs()
  const cid = await ipfs.dag.put(node, {})
  return cid.toString()
}

export function findLink(node: DAGNode, name: string): DAGLink | undefined {
  return node?.Links?.find((link: DAGLink) => link.Name === name)
}

export async function toHash(node: DAGNode): Promise<CID> {
  return putDAGNode(node)
}

export function splitPath(path: string): string[] {
  return path.split('/').filter(p => p.length > 0)
}
