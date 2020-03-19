import { addNestedLink, emptyDir, splitPath, nodeToDAGLink, cidToDAGLink, addLink, resolveDAGNode, findLink } from './helpers'
import { emptyPrivateDir, decryptDAGNode, getSymmKeyForDir } from './private'
import file from './file'
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

export async function get(root: CID, path: string, symmKey: string | null = null): Promise<CID | null> {
  return getRecurse(root, splitPath(path), symmKey)
}

export async function getRecurse(cid: CID, path: string[], symmKey: string | null = null): Promise<CID | null> {
  if(path.length === 0) {
    return cid
  }
  let node: DAGNode
  console.log('cid: ', cid)
  console.log('path: ', path)
  console.log('symmKey: ', symmKey)
  if(symmKey === null) {
    console.log('resolving')
    node = await resolveDAGNode(cid)
    console.log('resolved')
  } else {
    console.log('catting')
    const raw = await file.cat(cid)
    console.log('decrypting')
    node = await decryptDAGNode(raw, symmKey)
    console.log('decrypted')
  }
  if(!node) {
    return null
  }
  const link = findLink(node, path[0])
  if(!link) {
    return null
  }
  const nextCID = link.Hash.toString()
  if(path[0] === 'private' && path[1] !== 'header'){
    // if heading into private data dir
    symmKey = await getSymmKeyForDir(nextCID)
  }
  return getRecurse(nextCID, path.slice(1), symmKey)
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
  getRecurse,
  addPrivateDir
}
