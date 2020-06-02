import dagPB from 'ipld-dag-pb'

import { DAGLink, UnixFSFile, CID } from '../ipfs'
import { Tree, BasicLink, Link, Links, NodeMap, NodeInfo } from './types'
import { mapObj } from '../common/util'


export const toDAGLink = (link: BasicLink): DAGLink => {
  const { name, cid, size } = link
  return new dagPB.DAGLink(name, size, cid)
}

export const fromFSFile = (fsObj: UnixFSFile): Link => {
  const { name = '', cid, size, mtime, type } = fsObj
  return {
    name,
    cid: cid.toString(),
    size,
    mtime,
    isFile: type !== "dir"
  }
}

export const fromNodeMap = (nodes: NodeMap): Links => {
  return mapObj(nodes, val => {
    const { name, cid, size, mtime, isFile } = val
    return { name, cid, size, mtime, isFile }
  })
}

export const fromTree = (tree: Tree, cid: CID): NodeInfo => {
  const { name, size, isFile, mtime, version, key, cache } = tree.getHeader()
  return { cid, name, size, isFile, mtime, version, key, cache }
}

export const make = (name: string, cid: string, isFile: boolean, size?: number): Link => {
  return {
    name,
    cid,
    size,
    isFile,
    mtime: Date.now()
  }
}

export const arrToMap = (arr: Link[]): Links => {
  return arr.reduce((acc, cur) => {
    acc[cur.name] = cur
    return acc
  }, {} as Links)
}


export default {
  toDAGLink,
  fromFSFile,
  fromNodeMap,
  fromTree,
  make,
  arrToMap
}
