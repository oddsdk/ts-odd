import { BlockCodec } from "multiformats/codecs/interface"

import * as dagCBOR from "@ipld/dag-cbor"
import * as dagPB from "@ipld/dag-pb"
import * as raw from "multiformats/codecs/raw"


// CONSTANTS


export const CODECS_BY_NAME: Record<string, BlockCodec<number, unknown>> = {
  [ dagPB.name ]: dagPB,
  [ dagCBOR.name ]: dagCBOR,
  [ raw.name ]: raw,
}

export const CODECS_BY_CODE: Record<number, BlockCodec<number, unknown>> = {
  [ dagPB.code ]: dagPB,
  [ dagCBOR.code ]: dagCBOR,
  [ raw.code ]: raw,
}

export function getCodecByCode(code: number): BlockCodec<number, unknown> {
  const codec = CODECS_BY_CODE[ code ]
  if (!codec) throw new Error(`No codec was registered for the code: ${code}`)
  return codec
}

export function getCodecByName(name: string): BlockCodec<number, unknown> {
  const codec = CODECS_BY_NAME[ name ]
  if (!codec) throw new Error(`No codec was registered for the name: ${name}`)
  return codec
}



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