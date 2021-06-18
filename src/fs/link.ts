import dagPB, { DAGLink } from 'ipld-dag-pb'
import type { IPFSEntry } from 'ipfs-core-types/src/root'

import { Link, SimpleLink } from './types.js'
import { mtimeFromMs } from './metadata.js'


export const toDAGLink = (link: SimpleLink): DAGLink => {
  const { name, cid, size } = link
  return new dagPB.DAGLink(name, size, cid)
}

export const fromFSFile = (fsObj: IPFSEntry): Link => {
  const { name = '', cid, size, mtime, type } = fsObj
  return {
    name,
    cid: cid.toString(),
    size,
    mtime,
    isFile: type !== "dir"
  }
}

export const fromDAGLink = (link: DAGLink): SimpleLink => {
  const name = link.Name
  const cid = link.Hash.toString()
  const size = link.Tsize
  return { name, cid, size }
}

export const make = (name: string, cid: string, isFile: boolean, size: number): Link => {
  return {
    name,
    cid,
    size,
    isFile,
    mtime: mtimeFromMs(Date.now())
  }
}

type HasName = { name: string }

export const arrToMap = <T extends HasName>(arr: T[]): { [name: string]: T } => {
  return arr.reduce((acc, cur) => {
    acc[cur.name] = cur
    return acc
  }, {} as { [name: string]: T})
}
