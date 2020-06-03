import _ from 'lodash'
import { NonEmptyPath, Tree, File, Links, Header, CacheData } from './types'
import { isFile } from './types/check'
import { Maybe } from '../common/types'
import pathUtil from './path'
import { mapObj, isValue } from '../common'


export const addRecurse = async (
  tree: Tree,
  path: NonEmptyPath,
  child: Tree | File
): Promise<Tree> => {
  const name = path[0]
  const nextPath = pathUtil.nextNonEmpty(path)

  let toAdd: Tree | File

  if (nextPath === null) {
    toAdd = child
  } else {
    const nextTree = await tree.getOrCreateDirectChild(name)

    if (isFile(nextTree)) {
      throw new Error("Attempted to add a child to a File")
    }

    toAdd = await addRecurse(nextTree, nextPath, child)
  }

  return tree.updateDirectChild(toAdd, name)
}

export const getRecurse = async (
  tree: Tree,
  path: NonEmptyPath
): Promise<Tree | File | null> => {
  const head = path[0]
  const nextPath = pathUtil.nextNonEmpty(path)
  const nextTree = await tree.getDirectChild(head)

  if (nextPath === null) {
    return nextTree
  } else if (nextTree === null || isFile(nextTree)) {
    return null
  }

  return getRecurse(nextTree, nextPath)
}

type RecurseCacheInfo = {
  cacheData: CacheData
  parentKey: Maybe<string>
}

export const recurseCache = (
  header: Header,
  path: NonEmptyPath
): RecurseCacheInfo | null => {
  const head = path[0]
  const nextPath = pathUtil.nextNonEmpty(path)
  const nextCache = header.cache[head]

  if(!nextCache){
    return null
  }else if (nextPath === null) {
    return {
      cacheData: nextCache,
      parentKey: header.key
    }
  } else if (nextCache.isFile) {
    return null
  }

  return recurseCache(nextCache, nextPath)
}

export const getCached = async (
  tree: Tree,
  path: NonEmptyPath
): Promise<Tree | File | null> => {
  const result = recurseCache(tree.getHeader(), path)
  if(result === null) {
    return null
  }

  const { cacheData, parentKey  } = result
  const { cid, isFile } = cacheData
  if(isFile){
    return tree.static.file.fromCID(cid, parentKey || undefined)
  }else{
    return tree.static.tree.fromCID(cid, parentKey || undefined)
  }
}

export const lsCached = (
  tree: Tree,
  path: NonEmptyPath
): Links | null => {
  const result = recurseCache(tree.getHeader(), path)
  if(result === null) {
    return null
  }else if (result.cacheData.isFile){
    throw new Error('Can not `ls` a file')
  }

  const cache = result.cacheData.cache
  const filtered = _.pickBy(cache, isValue)
  return mapObj(filtered, (data, name) => {
    const { cid, mtime, isFile = false } = data
    return { name, cid, mtime, isFile }
  })
}

export const rmNested = async (
  tree: Tree,
  path: NonEmptyPath
): Promise<Tree> => {
  const filename = path[path.length - 1]
  const parentPath = path.slice(0, path.length - 1)
  const node = await tree.get(pathUtil.join(parentPath))

  if (node === null || isFile(node)) {
    throw new Error("Path does not exist")
  }

  const updated = await node.removeDirectChild(filename)
  return parentPath.length > 0
          ? tree.addChild(pathUtil.join(parentPath), updated)
          : updated
}

// export const pinMapToList = (obj: PinMap | CID ): CID[] => {
//   if(isCID(obj)) {
//     return [obj]
//   }
//   return Object.entries(obj).reduce((acc, cur) => {
//     const [parent, children] = cur
//     const childList = pinMapToList(children)
//     return [
//       ...acc,
//       ...childList,
//       parent
//     ]
//   }, [] as CID[])
// }


export default {
  addRecurse,
  getRecurse,
  getCached,
  lsCached,
  rmNested,
  // pinMapToList
}
