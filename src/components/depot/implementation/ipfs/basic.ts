import { CID } from "multiformats/cid"
import * as dagPB from "@ipld/dag-pb"
import { PBLink, PBNode } from "@ipld/dag-pb"

import * as uint8arrays from "uint8arrays"

import type { IPFSEntry } from "ipfs-core-types/src/root"
import type { ImportCandidate } from "ipfs-core-types/src/utils"

import { AddResult } from "./types.js"
import { DAG_NODE_DATA } from "./constants.js"
import { get as getIpfs } from "./config.js"
import { decodeCID, isObject, isString } from "../common/index.js"
import { setup } from "../setup/internal.js"

import * as util from "./util.js"


export const add = async (content: ImportCandidate): Promise<AddResult> => {
  const ipfs = await getIpfs()
  const result = await ipfs.add(content, { cidVersion: 1, pin: setup.shouldPin })

  return {
    cid: decodeCID(result.cid),
    size: result.size,
    isFile: true
  }
}

export const catRaw = async (cid: CID): Promise<Uint8Array[]> => {
  const newCID = typeCheckCID(cid)

  const ipfs = await getIpfs()
  const chunks = []

  for await (const chunk of ipfs.cat(newCID)) {
    chunks.push(chunk)
  }
  return chunks
}

export const catBuf = async (cid: CID): Promise<Uint8Array> => {
  const newCID = typeCheckCID(cid)

  const raw = await catRaw(newCID)
  return uint8arrays.concat(raw)
}

export const cat = async (cid: CID): Promise<string> => {
  const newCID = typeCheckCID(cid)

  const buf = await catBuf(newCID)
  return buf.toString()
}


export const dagGet = async (cid: CID): Promise<PBNode> => {
  const newCID = typeCheckCID(cid)

  const ipfs = await getIpfs()

  const raw = await ipfs.dag.get(newCID)
  const node = util.rawToDAGNode(raw)
  return node
}

export const dagPut = async (node: PBNode): Promise<AddResult> => {
  const ipfs = await getIpfs()
  const newNode = dagPB.createNode(
    node.Data || new Uint8Array(),
    node.Links.map(link => dagPB.createLink(
      link.Name || "",
      link.Tsize || 0,
      link.Hash
    ))
  )
  // Using this format because Gateway doesn't like `dag-cbor` nodes.
  // I think this is because UnixFS requires `dag-pb` & the gateway requires UnixFS for directory traversal
  const cid = await ipfs.dag.put(
    newNode,
    {
      storeCodec: "dag-pb",
      hashAlg: "sha2-256"
    }
  ).then(decodeCID)

  const nodeSize = await size(cid)
  return {
    cid,
    size: nodeSize,
    isFile: false
  }
}

export const dagPutLinks = async (links: PBLink[]): Promise<AddResult> => {
  const node = dagPB.createNode(DAG_NODE_DATA, links)
  return dagPut(node)
}

export const size = async (cid: CID): Promise<number> => {
  const newCID = typeCheckCID(cid)

  const ipfs = await getIpfs()
  const stat = await ipfs.files.stat(`/ipfs/${newCID}`)
  return stat.cumulativeSize
}

const typeCheckCID = (cid: CID): CID => {
  const newCID = CID.asCID(cid)
  if (!newCID) throw new Error(`Expected a CID class instance: Found ${cid}`)
  return newCID
}
