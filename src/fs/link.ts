import dagPb, { DAGLink } from "ipld-dag-pb"
import type { IPFSEntry } from "ipfs-core-types/src/root"

import { HardLink, SimpleLink } from "./types.js"


export const toDAGLink = (link: SimpleLink): DAGLink => {
  const { name, cid, size } = link
  return new dagPb.DAGLink(name, size, cid)
}

export const fromFSFile = (fsObj: IPFSEntry): HardLink => {
  const { name = "", cid, size, type } = fsObj
  return {
    name,
    cid: cid.toString(),
    size,
    isFile: type !== "dir"
  }
}

export const fromDAGLink = (link: DAGLink): SimpleLink => {
  const name = link.Name
  const cid = link.Hash.toString()
  const size = link.Tsize
  return { name, cid, size }
}

export const make = (name: string, cid: string, isFile: boolean, size: number): HardLink => {
  return {
    name,
    cid,
    size,
    isFile
  }
}

type HasName = { name: string }

export const arrToMap = <T extends HasName>(arr: T[]): { [name: string]: T } => {
  return arr.reduce((acc, cur) => {
    acc[cur.name] = cur
    return acc
  }, {} as { [name: string]: T})
}
