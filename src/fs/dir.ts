import getIpfs from 'get-ipfs'
import dagPB from 'ipld-dag-pb'

const IPFS_CFG = { browserPeers: [  "/dns4/node.runfission.com/tcp/4003/wss/ipfs/QmVLEz2SxoNiFnuyLpbXsH6SvjPTrHNMU88vCQZyhgBzgw"] }

type DAGNode = any

type DAGLink = {
  Name: string
  Hash: string
  Size: number
}

function emptyFolder() {
  return new dagPB.DAGNode(Buffer.from([8, 1]))
}

export async function mkdir(parent: string | DAGNode, folderName: string): Promise<string> {
  const node = await resolveDAGNode(parent)
  const found = findLink(node, folderName)
  if(found !== undefined){
    return toHash(node)
  }

  const child = emptyFolder()
  await putDAGNode(child)
  const childLink = await child.toDAGLink({ name: folderName })
  return addLink(node, childLink)
}

export async function mkdirp(parent: string | DAGNode, folderPath: string): Promise<string> {
  const path = splitPath(folderPath)
  if(path.length === 0){
    return toHash(parent)
  }
  const link = await emptyFolder().toDAGLink({ name: path[path.length -1] })
  const restOfPath = path.slice(0, path.length -1).join('/')
  return addNestedLink(parent, restOfPath, link, false)
}

export async function addLink(parent: string | DAGNode, link: DAGLink): Promise<string> {
  const node = await resolveDAGNode(parent)
  return addNestedLinkRecurse(node, [], link, true)
}

export async function addNestedLink(parent: string | DAGNode, folderName: string, link: DAGLink, shouldOverwrite: boolean = true): Promise<string> {
  const node = await resolveDAGNode(parent)
  const updated = await addNestedLinkRecurse(node, splitPath(folderName), link, shouldOverwrite)
  const hash = (await updated.toDAGLink()).Hash.toString()
  return hash
}

export async function addNestedLinkRecurse(parent: DAGNode, path: string[], link: DAGLink, shouldOverwrite: boolean = true): Promise<DAGNode> {
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
      child = emptyFolder()
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
  const ipfs = await getIpfs(IPFS_CFG)
  if(typeof node === 'string'){
    const raw = await ipfs.dag.get(node)
    return new dagPB.DAGNode(raw.value._data, raw.value._links)
  }else{
    return node
  }
}

export async function putDAGNode(node: DAGNode): Promise<string> { 
  const ipfs = await getIpfs(IPFS_CFG)
  const cid = ipfs.dag.put(node, { format: 'dag-pb', hashAlg: 'sha2-256' })
  return cid.toString()
}

export function findLink(node: DAGNode, name: string): DAGLink {
  console.log("node: ", node)
  return node?.Links?.find((link: DAGLink) => link.Name === name)
}

export async function toHash(node: DAGNode): Promise<string> {
  return (await node.toDAGLink()).Hash.toString()
}

export function splitPath(path: string): string[] {
  return path.split('/').filter(p => p.length > 0)
}
