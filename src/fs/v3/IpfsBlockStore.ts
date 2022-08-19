import type { IPFS } from "ipfs-core-types"

import * as uint8arrays from "uint8arrays"
import { CID } from "multiformats/cid"

// Codecs
import * as dagPB from "@ipld/dag-pb"
import * as dagCBOR from "@ipld/dag-cbor"
import * as raw from "multiformats/codecs/raw"
import { BlockCodec } from "multiformats/codecs/interface"


const CODECS: Record<number, BlockCodec<number, unknown>> = {
  [dagPB.code]: dagPB,
  [dagCBOR.code]: dagCBOR,
  [raw.code]: raw,
}

export interface BlockStore {
  putBlock(bytes: Uint8Array, code: number): Promise<Uint8Array>
  getBlock(cid: Uint8Array): Promise<Uint8Array | undefined>
}

export class IpfsBlockStore implements BlockStore {
  private ipfs: IPFS

  /** Creates a new in-memory block store. */
  constructor(ipfs: IPFS) {
    this.ipfs = ipfs
  }

  /** Stores an array of bytes in the block store. */
  async getBlock(cid: Uint8Array): Promise<Uint8Array | undefined> {
    const decodedCid = CID.decode(cid)
    return await this.ipfs.block.get(decodedCid)
  }

  /** Retrieves an array of bytes from the block store with given CID. */
  async putBlock(bytes: Uint8Array, code: number): Promise<Uint8Array> {
    const format = CODECS[code].name

    if (format == null) {
      throw new Error(`Error during putBlock: Unknown codec: ${numberHex(code)}. Is it part of the multicodec table (https://github.com/multiformats/multicodec/blob/master/table.csv)?`)
    }

    const mhtype = "sha2-256"
    const version = 1
    const pin = false

    const cid = await this.ipfs.block.put(bytes, { format, mhtype, version, pin })

    return cid.bytes
  }
}

function numberHex(num: number): string {
  const codeUint8Array = new Uint8Array(4)
  const numberByteView = new DataView(codeUint8Array.buffer)
  numberByteView.setUint32(0, num)
  const hex = uint8arrays.toString(codeUint8Array, "hex")
  const trimmed = hex.replace(/^(00)*/, "")
  return `0x${trimmed}`
}
