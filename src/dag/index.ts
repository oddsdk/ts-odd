import { CID } from "multiformats/cid"

import * as DagCBOR from "@ipld/dag-cbor"
import * as DagPB from "@ipld/dag-pb"

import * as Codecs from "./codecs.js"
import * as Depot from "../components/depot/implementation.js"


// CONSTANTS


// These bytes in the "data" field of a DAG-PB node indicate that the node is an IPLD DAG Node
export const PB_IPLD_DATA = new Uint8Array([ 8, 1 ])



// BYTES


export function fromBytes(
  storeCodecId: Codecs.CodecIdentifier,
  bytes: Uint8Array
): unknown {
  const storeCodec = Codecs.getByIdentifier(storeCodecId)
  return storeCodec.decode(bytes)
}

export function toBytes(
  storeCodecId: Codecs.CodecIdentifier,
  dagNode: unknown
): Uint8Array {
  const storeCodec = Codecs.getByIdentifier(storeCodecId)
  return storeCodec.encode(dagNode)
}



// GET


export async function get(depot: Depot.Implementation, cid: CID): Promise<unknown> {
  const codec = Codecs.getByCode(cid.code)
  return codec.decode(await depot.getBlock(cid))
}

export async function getCBOR(depot: Depot.Implementation, cid: CID): Promise<unknown> {
  Codecs.expect(DagCBOR.code, cid)
  return DagCBOR.decode(await depot.getBlock(cid))
}

export async function getPB(depot: Depot.Implementation, cid: CID): Promise<DagPB.PBNode> {
  Codecs.expect(DagPB.code, cid)
  return DagPB.decode(await depot.getBlock(cid))
}



// PUT


export function putPB(depot: Depot.Implementation, links: DagPB.PBLink[]): Promise<CID> {
  const node = DagPB.createNode(PB_IPLD_DATA, links)
  return depot.putBlock(DagPB.encode(node), DagPB.code)
}