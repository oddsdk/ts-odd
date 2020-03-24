import pathUtil from './path'
import { Node, NonEmptyPath } from './types'

export async function addChildRecurse(node: Node, path: NonEmptyPath, child: Node, shouldOverwrite: boolean = true): Promise<Node> {
  const name = path[0]
  const nextPath = pathUtil.nextNonEmpty(path)
  const nextLink = await node.findLink(name)
  let toAdd: Node
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

export async function getRecurse(node: Node, path: string[]): Promise<Node | null> {
  if(path.length === 0){
    return node
  }
  const nextNode = await node.resolveChild(path[0])
  if(nextNode === null){
    return null
  }
  return getRecurse(nextNode, path.slice(1))
}

export default {
  addChildRecurse,
  getRecurse,
}
