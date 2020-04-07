import dagPB from 'ipld-dag-pb'
import { DAGLink, UnixFSFile } from '../ipfs'
import { BasicLink, Link } from './types'

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

export const make = (name: string, cid: string, isFile: boolean, size?: number): Link => {
  return {
    name,
    cid,
    size,
    isFile,
    mtime: Date.now()
  }
}

export default {
  toDAGLink,
  fromFSFile,
  make,
}
