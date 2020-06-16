import dagPB from 'ipld-dag-pb'

import { DAGLink, UnixFSFile } from '../ipfs'
import { BasicLink, Link, Links, NodeMap } from './types'
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
    const { name = '', cid, size, mtime, isFile } = val
    return { name, cid, size, mtime, isFile }
  })
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
  make,
  arrToMap
}
