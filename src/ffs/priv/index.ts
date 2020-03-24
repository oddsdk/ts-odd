import { CID, FileContent } from '../../ipfs'
import file from '../file'
import { decrypt } from './helpers'
import path from '../path'
import { addChildRecurse, getRecurse } from '../helpers'
import { Link } from '../types'
import privNode, { PrivateNode } from './node'

export async function mkdir(root: CID, folderPath: string, rootKey: string): Promise<CID> {
  const parts = path.splitNonEmpty(folderPath)
  if(parts === null) {
    return root
  }
  const toAdd = await privNode.empty()
  return addChild(root, folderPath, rootKey, toAdd, false)
}

export async function addChild(root: CID, folderPath: string, rootKey: string, toAdd: PrivateNode, shouldOverwrite: boolean = true): Promise<CID> {
  const node = await privNode.resolve(root, rootKey)
  const parts = path.splitNonEmpty(folderPath)
  if(parts === null) {
    return root
  }
  const updated = (await addChildRecurse(node, parts, toAdd, shouldOverwrite)) as PrivateNode
  return updated.put(rootKey)
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

export async function get(root: CID, folderPath: string, rootKey: string): Promise<PrivateNode | null> {
  const node = await privNode.resolve(root, rootKey)
  return (await getRecurse(node, path.split(folderPath))) as PrivateNode
}
