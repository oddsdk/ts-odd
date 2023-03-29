import { CID } from "multiformats/cid"

import * as DagCBOR from "@ipld/dag-cbor"
import * as DagPB from "@ipld/dag-pb"
import * as Raw from "multiformats/codecs/raw"

import * as Codecs from "./codecs.js"
import * as Depot from "../components/depot/implementation.js"



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

export async function getRaw(depot: Depot.Implementation, cid: CID): Promise<Uint8Array> {
  Codecs.expect(Raw.code, cid)
  return Raw.decode(await depot.getBlock(cid))
}



// PUT


export function putPB(depot: Depot.Implementation, links: DagPB.PBLink[]): Promise<CID> {
  const node = DagPB.createNode(new Uint8Array(), links)
  return depot.putBlock(DagPB.encode(node), DagPB.code)
}