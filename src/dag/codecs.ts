import * as Uint8arrays from "uint8arrays"

import * as DagCBOR from "@ipld/dag-cbor"
import * as DagPB from "@ipld/dag-pb"
import * as Raw from "multiformats/codecs/raw"

import { BlockCodec } from "multiformats/codecs/interface"
import { CID } from "multiformats/cid"


// 🧩


export type CodecIdentifier = (
  typeof DagCBOR.code | typeof DagCBOR.name |
  typeof DagPB.code | typeof DagPB.name |
  typeof Raw.code | typeof Raw.name
)



// 🏔


export const BY_NAME: Record<string, BlockCodec<number, any>> = {
  [ DagPB.name ]: DagPB,
  [ DagCBOR.name ]: DagCBOR,
  [ Raw.name ]: Raw,
}

export const BY_CODE: Record<number, BlockCodec<number, any>> = {
  [ DagPB.code ]: DagPB,
  [ DagCBOR.code ]: DagCBOR,
  [ Raw.code ]: Raw,
}

export function getByCode(code: number): BlockCodec<number, any> {
  const codec = BY_CODE[ code ]
  if (!codec) throw new Error(`No codec was registered for the code: ${numberHex(code)}. Is it part of the multicodec table (https://github.com/multiformats/multicodec/blob/master/table.csv)?`)
  return codec
}

export function getByName(name: string): BlockCodec<number, any> {
  const codec = BY_NAME[ name ]
  if (!codec) throw new Error(`No codec was registered for the name: ${name}`)
  return codec
}

export function getByIdentifier(id: CodecIdentifier): BlockCodec<number, any> {
  if (typeof id === "string") return getByName(id)
  return getByCode(id)
}



// 🛠


export function expect(codecId: CodecIdentifier, cid: CID): void {
  const codec = getByIdentifier(codecId)

  if (cid.code !== codec.code) {
    const cidCodec = getByCode(cid.code)
    throw new Error(`Expected a ${codec.name} CID, found a ${cidCodec.name} CID instead.`)
  }
}


export function isIdentifier(codeOrName: number | string): codeOrName is CodecIdentifier {
  return typeof codeOrName === "string" ? !!BY_NAME[ codeOrName ] : !!BY_CODE[ codeOrName ]
}


export function numberHex(num: number): string {
  const codeUint8Array = new Uint8Array(4)
  const numberByteView = new DataView(codeUint8Array.buffer)
  numberByteView.setUint32(0, num)
  const hex = Uint8arrays.toString(codeUint8Array, "hex")
  const trimmed = hex.replace(/^(00)*/, "")
  return `0x${trimmed}`
}