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

export const getRecurse = async (tree: Tree, path: string[]): Promise<Tree | File> => {
  const nextTree = await tree.getDirectChild(path[0])
  if(path.length <= 1 && nextTree !== null){
    return nextTree
  }
  if(nextTree === null || isFile(nextTree)){
    throw new Error("Path does not exist")
  }
  return getRecurse(nextTree, path.slice(1))
}

export default {
  isFile,
  addRecurse,
  getRecurse,
}
