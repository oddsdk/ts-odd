import { CID } from "multiformats/cid"

import * as Codecs from "../../dag/codecs.js"
import * as Depot from "../../components/depot/implementation.js"


export interface BlockStore {
  putBlock(bytes: Uint8Array, code: number): Promise<Uint8Array>
  getBlock(cid: Uint8Array): Promise<Uint8Array | undefined>
}

export class DepotBlockStore implements BlockStore {
  private depot: Depot.Implementation

  constructor(depot: Depot.Implementation) {
    this.depot = depot
  }

  /** Stores an array of bytes in the block store. */
  async getBlock(cid: Uint8Array): Promise<Uint8Array | undefined> {
    const decodedCid = CID.decode(cid)
    return await this.depot.getBlock(decodedCid)
  }

  /** Retrieves an array of bytes from the block store with given CID. */
  async putBlock(bytes: Uint8Array, code: number): Promise<Uint8Array> {
    if (!Codecs.isIdentifier(code)) throw new Error(`No codec was registered for the code: ${Codecs.numberHex(code)}`)

    const cid = await this.depot.putBlock(bytes, code)
    return cid.bytes
  }
}
