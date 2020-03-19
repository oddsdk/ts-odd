import { addNestedLink, emptyDir, splitPath, nodeToDAGLink, cidToDAGLink, addLink, resolveDAGNode, findLink } from './helpers'
import { emptyPrivateDir } from './private'
import { getIpfs, UnixFSFile, CID, DAGNode } from '../ipfs'

export async function list(cid: CID): Promise<UnixFSFile[]> {
  const ipfs = await getIpfs()
  const result = await ipfs.ls(cid)

  // if good old array
  if (Array.isArray(result)) {
    return result
  }

  // if async iterable
  const array = []
  for await (const file of result) {
    array.push(file)
  }
  return array
}

export async function get(root: CID, path: string): Promise<CID | null> {
  const parts = path.split('/')
  return getRecurse(root, parts)
}

export async function getRecurse(cid: CID, path: string[]): Promise<CID | null> {
  if(path.length === 0) {
    return cid
  }
  const node = await resolveDAGNode(cid)
  if(!node) {
    return null
  }
  const link = findLink(node, path[0])
  if(!link) {
    return null
  }
  return getRecurse(link.Hash.toString(), path.slice(1))
}

export async function make(root: CID, folderPath: string): Promise<CID> {
  const path = splitPath(folderPath)
  if(path.length === 0){
    return root
  }
  const empty = await emptyDir()
  const link = await nodeToDAGLink(empty, path[path.length -1] )
  const restOfPath = path.slice(0, path.length -1).join('/')
  return addNestedLink(root, restOfPath, link, { shouldOverwrite: false })
}

export async function addPrivateDir(root: CID): Promise<CID> {
  const priv = await emptyPrivateDir()
  const link = await cidToDAGLink(priv, 'private')
  return addLink(root, link)
}

export default {
  make,
  list,
  get,
  addPrivateDir
}
