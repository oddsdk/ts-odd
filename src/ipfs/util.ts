import * as dagPB from "@ipld/dag-pb"
import { CID } from "multiformats/cid"
import { PBLink, PBNode } from "@ipld/dag-pb"
import type { GetResult } from "ipfs-core-types/src/dag"

type RawDAGLink = {
  Name: string
  Hash: CID
  Tsize: number
}

const rawToDAGLink = (raw: RawDAGLink): PBLink => {
  console.log("😈", raw)
  return dagPB.createLink(raw.Name, raw.Tsize, raw.Hash)
}

export const rawToDAGNode = (raw: GetResult): PBNode => {
  const data = raw?.value?.Data
  const links = raw?.value?.Links?.map(rawToDAGLink)
  return dagPB.createNode(data, links)
}
