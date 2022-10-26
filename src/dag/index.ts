import * as Uint8arrays from "uint8arrays"
import { BlockCodec } from "multiformats/codecs/interface"
import { CID } from "multiformats/cid"

import * as DagCBOR from "@ipld/dag-cbor"
import * as DagPB from "@ipld/dag-pb"
import * as Raw from "multiformats/codecs/raw"

import * as Depot from "../components/depot/implementation.js"


// CONSTANTS


export const CODECS_BY_NAME: Record<string, BlockCodec<number, unknown>> = {
  [ DagPB.name ]: DagPB,
  [ DagCBOR.name ]: DagCBOR,
  [ Raw.name ]: Raw,
}

export const CODECS_BY_CODE: Record<number, BlockCodec<number, unknown>> = {
  [ DagPB.code ]: DagPB,
  [ DagCBOR.code ]: DagCBOR,
  [ Raw.code ]: Raw,
}

export function getCodecByCode(code: number): BlockCodec<number, unknown> {
  const codec = CODECS_BY_CODE[ code ]
  if (!codec) throw new Error(`No codec was registered for the code: ${numberHex(code)}. Is it part of the multicodec table (https://github.com/multiformats/multicodec/blob/master/table.csv)?`)
  return codec
}

export function getCodecByName(name: string): BlockCodec<number, unknown> {
  const codec = CODECS_BY_NAME[ name ]
  if (!codec) throw new Error(`No codec was registered for the name: ${name}`)
  return codec
}

// These bytes in the "data" field of a DAG-PB node indicate that the node is an IPLD DAG Node
export const PB_IPLD_DATA = new Uint8Array([ 8, 1 ])



// BYTES


export function fromBytes(
  storeCodecName: string,
  bytes: Uint8Array
): unknown {
  const storeCodec = getCodecByName(storeCodecName)
  return storeCodec.decode(bytes)
}

export function toBytes(
  storeCodecName: string,
  dagNode: unknown
): Uint8Array {
  const storeCodec = getCodecByName(storeCodecName)
  return storeCodec.encode(dagNode)
}



// GET


export async function get(depot: Depot.Implementation, cid: CID): Promise<unknown> {
  const codec = getCodecByCode(cid.code)
  return codec.decode(await depot.getBlock(cid))
}

export async function getCBOR(depot: Depot.Implementation, cid: CID): Promise<unknown> {
  expectCodec(DagCBOR, cid)
  return DagCBOR.decode(await depot.getBlock(cid))
}

export async function getPB(depot: Depot.Implementation, cid: CID): Promise<DagPB.PBNode> {
  expectCodec(DagPB, cid)
  return DagPB.decode(await depot.getBlock(cid))
}



// PUT


export function putPB(depot: Depot.Implementation, links: DagPB.PBLink[]): Promise<CID> {
  const node = DagPB.createNode(PB_IPLD_DATA, links)
  return depot.putBlock(DagPB.encode(node), DagPB)
}



// 🛠


export function expectCodec(codec: BlockCodec<number, unknown>, cid: CID): void {
  if (cid.code !== codec.code) {
    const cidCodec = getCodecByCode(cid.code)
    throw new Error(`Expected a ${codec.name} CID, found a ${cidCodec.name} CID instead.`)
  }
}


export function numberHex(num: number): string {
  const codeUint8Array = new Uint8Array(4)
  const numberByteView = new DataView(codeUint8Array.buffer)
  numberByteView.setUint32(0, num)
  const hex = Uint8arrays.toString(codeUint8Array, "hex")
  const trimmed = hex.replace(/^(00)*/, "")
  return `0x${trimmed}`
}