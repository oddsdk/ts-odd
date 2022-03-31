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
  typeCheckCID(cid)

  const ipfs = await getIpfs()
  const chunks = []
  await attemptPin(cid)
  for await (const chunk of ipfs.cat(cid)) {
    chunks.push(chunk)
  }
  return chunks
}

export const catBuf = async (cid: CID): Promise<Uint8Array> => {
  typeCheckCID(cid)

  const raw = await catRaw(cid)
  return uint8arrays.concat(raw)
}

export const cat = async (cid: CID): Promise<string> => {
  typeCheckCID(cid)

  const buf = await catBuf(cid)
  return buf.toString()
}

export const ls = async (cid: CID): Promise<IPFSEntry[]> => {
  typeCheckCID(cid)

  const ipfs = await getIpfs()
  const links = []
  for await (const link of ipfs.ls(cid)) {
    links.push({ ...link, cid: decodeCID(link.cid) })
  }
  return links
}

export const dagGet = async (cid: CID): Promise<PBNode> => {
  typeCheckCID(cid)

  const ipfs = await getIpfs()
  await attemptPin(cid)
  const raw = await ipfs.dag.get(cid)
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

  await attemptPin(cid)
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
  typeCheckCID(cid)

  const ipfs = await getIpfs()
  const stat = await ipfs.files.stat(`/ipfs/${cid}`)
  return stat.cumulativeSize
}

const attemptPin = async (cid: CID): Promise<void> => {
  if (!setup.shouldPin) return

  const ipfs = await getIpfs()
  try {
    await ipfs.pin.add(cid, { recursive: false })
  } catch (err) {
    if (!isObject(err)) throw err
    if (!isString(err.message)) throw err
    if (!err.message || !err.message.includes("already pinned recursively")) {
      throw err
    }
  }
}

const typeCheckCID = (cid: CID): void => {
  if (!CID.asCID(cid)) throw new Error("Expected a CID object")
}
