import * as dagPB from "@ipld/dag-pb"
import { PBLink } from "@ipld/dag-pb"
import { CID } from "multiformats/cid"
import type { IPFSEntry } from "ipfs-core-types/src/root"

import { HardLink, SimpleLink } from "./types.js"
import { decodeCID } from "../common/cid.js"


export const toDAGLink = (link: SimpleLink): PBLink => {
  const { name, cid, size } = link
  return dagPB.createLink(name, size, decodeCID(cid))
}

export const fromFSFile = (fsObj: IPFSEntry): HardLink => {
  const { name = "", cid, size, type } = fsObj
  return {
    name,
    cid: cid,
    size,
    isFile: type !== "dir"
  }
}

export const fromDAGLink = (link: PBLink): SimpleLink => {
  const name = link.Name || ""
  const cid = link.Hash
  const size = link.Tsize || 0
  return { name, cid, size }
}

export const make = (name: string, cid: CID, isFile: boolean, size: number): HardLink => {
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
