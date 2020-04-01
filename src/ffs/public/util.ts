import dagPB from 'ipld-dag-pb'
import ipfs, { CID } from '../../ipfs'
import { NonEmptyPath, Tree, Links } from '../types'
import link from '../link'
import pathUtil from '../path'

export const dagNodeData = Buffer.from([8, 1])

export const linksFromCID = async (cid: CID): Promise<Links> => {
  const links = await ipfs.ls(cid)
  return links.reduce((acc, cur) => {
    acc[cur.name || ''] = link.fromFSFile(cur)
    return acc
  }, {} as Links)
}

export const putLinks = async (links: Links): Promise<CID> => { 
  const dagLinks = Object.values(links).map(link.toDAGLink)
  const node = new dagPB.DAGNode(dagNodeData, dagLinks)
  return ipfs.dagPut(node)
}

export const addRecurse = async (tree: Tree, path: NonEmptyPath, child: Tree): Promise<Tree> => {
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

export const getRecurse = async (tree: Tree, path: string[]): Promise<Tree | null> => {
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
  linksFromCID,
  putLinks,
  addRecurse,
  getRecurse
}
