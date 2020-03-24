import { CID, FileContent } from '../../ipfs'
import file from '../file'
import { decrypt } from './helpers'
import { splitPath, splitPathNonEmpty, nextPathNonEmpty } from '../helpers'
import { NonEmptyPath, Link } from '../types'
import privNode, { PrivateNode } from './node'

export async function mkdir(root: CID, path: string, rootKey: string) {
  const parts = splitPathNonEmpty(path)
  if(parts === null) {
    return root
  }
  const toAdd = await privNode.empty()
  return addChild(root, path, rootKey, toAdd, false)
}

export async function addChild(root: CID, path: string, rootKey: string, toAdd: PrivateNode, shouldOverwrite: boolean = true): Promise<CID> {
  const node = await privNode.resolve(root, rootKey)
  const parts = splitPathNonEmpty(path)
  if(parts === null) {
    return root
  }
  const updated = await addChildRecurse(node, parts, toAdd, shouldOverwrite)
  return updated.put(rootKey)
}

export async function addChildRecurse(node: PrivateNode, path: NonEmptyPath, child: PrivateNode, shouldOverwrite: boolean = true): Promise<PrivateNode> {
  const name = path[0]
  const nextPath = nextPathNonEmpty(path)
  const nextLink = await node.findLink(name)
  let toAdd: PrivateNode
  if(nextPath === null) {
    // if child already exists & non-destructive, then do nothing
    if(nextLink !== null && !shouldOverwrite) {
      return node
    }
    toAdd = child
  } else {
    const nextNode = await node.resolveOrAddChild(name)
    toAdd = await addChildRecurse(nextNode, nextPath, child, shouldOverwrite)
  }
  return node.updateChild(toAdd, name)
}

export async function getFile(root: CID, path: string, rootKey: string): Promise<FileContent | null> {
  const fileNode = await get(root, path, rootKey)
  if(fileNode === null){
    return null
  }
  const contentLink = fileNode.findLink('index')
  if(contentLink === null){
    return null
  }
  const content = await file.catBuf(contentLink.cid)
  return decrypt(content, fileNode.key)
}

export async function listDirectory(root: CID, path: string, rootKey: string): Promise<Link[] | null> {
  const node = await get(root, path, rootKey)
  return node?.links || []
}

export async function get(root: CID, path: string, rootKey: string): Promise<PrivateNode | null> {
  const node = await privNode.resolve(root, rootKey)
  return getRecurse(node, splitPath(path))
}

export async function getRecurse(node: PrivateNode, path: string[]): Promise<PrivateNode | null> {
  if(path.length === 0){
    return node
  }
  const nextNode = await node.resolveChild(path[0])
  if(nextNode === null){
    return null
  }
  return getRecurse(nextNode, path.slice(1))
}
