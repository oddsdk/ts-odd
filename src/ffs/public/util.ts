import dagPB from 'ipld-dag-pb'
import ipfs, { CID, DAGLink } from '../../ipfs'
import { NonEmptyPath, Tree, Link } from '../types'
import pathUtil from '../path'

export const dagNodeData = Buffer.from([8, 1])

export function toDAGLink(link: Link): DAGLink {
  const { name, cid, size } = link
  return new dagPB.DAGLink(name, size, cid)
}

export function toLink(dagLink: DAGLink): Link {
  const { Name, Hash, Size } = dagLink
  return {
    name: Name,
    cid: Hash.toString(),
    size: Size
  }
}

export async function linksFromCID(cid: CID): Promise<Link[]> {
  const dagNode = await ipfs.dagGet(cid)
  return dagNode.Links?.map(toLink) || []
}

export async function putLinks(links: Link[]): Promise<CID> { 
  const dagLinks = links.map(toDAGLink)
  const node = new dagPB.DAGNode(dagNodeData, dagLinks)
  return ipfs.dagPut(node)
}

export async function addRecurse(tree: Tree, path: NonEmptyPath, child: Tree): Promise<Tree> {
  const name = path[0]
  const nextPath = pathUtil.nextNonEmpty(path)
  let toAdd: Tree
  if(nextPath === null) {
    toAdd = child
  } else {
    const nextTree = await tree.getOrCreateDirectChild(name)
    toAdd = await addRecurse(nextTree, nextPath, child)
  }
  return tree.updateDirectChild(toAdd, name)
}

export async function getRecurse(tree: Tree, path: string[]): Promise<Tree | null> {
  if(path.length === 0){
    return tree
  }
  const nextTree = await tree.getDirectChild(path[0])
  if(nextTree === null){
    return null
  }
  return getRecurse(nextTree, path.slice(1))
}

export default {
  toDAGLink,
  toLink,
  linksFromCID,
  putLinks,
  addRecurse,
  getRecurse
}
