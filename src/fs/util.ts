import { NonEmptyPath, Tree, File } from './types'
import pathUtil from './path'

export const isFile = (obj: any): obj is File => {
  return obj.isFile
}

export const addRecurse = async (tree: Tree, path: NonEmptyPath, child: Tree | File): Promise<Tree> => {
  const name = path[0]
  const nextPath = pathUtil.nextNonEmpty(path)
  let toAdd: Tree | File
  if(nextPath === null) {
    toAdd = child
  } else {
    const nextTree = await tree.getOrCreateDirectChild(name)
    if(isFile(nextTree)){
      throw new Error("Attempted to add a child to a File")
    }
    toAdd = await addRecurse(nextTree, nextPath, child)
  }
  return tree.updateDirectChild(toAdd, name)
}

export const getRecurse = async (tree: Tree, path: NonEmptyPath): Promise<Tree | File | null> => {
  const head = path[0]
  const nextPath = pathUtil.nextNonEmpty(path)
  const nextTree = await tree.getDirectChild(head)
  if(nextPath === null){
    return nextTree
  } else if (nextTree === null || isFile(nextTree)){
    return null
  } 
  return getRecurse(nextTree, nextPath)
}

export const rmNested = async (tree: Tree, path: NonEmptyPath): Promise<Tree> => {
  const filename = path[path.length -1]
  const parentPath = path.slice(0, path.length -1)
  const node = await tree.get(pathUtil.join(parentPath))
  if(node === null || isFile(node)){
    throw new Error("Path does not exist")
  }
  const updated = await node.removeDirectChild(filename)
  return parentPath.length > 0 
          ? tree.addChild(pathUtil.join(parentPath), updated) 
          : updated
}

export default {
  isFile,
  addRecurse,
  getRecurse,
  rmNested
}
