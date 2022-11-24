import type { CID } from "multiformats/cid"

import * as Depot from "../../components/depot/implementation.js"
import * as Protocol from "../protocol/index.js"

import { PutResult } from "../../components/depot/implementation.js"
import { isObject, hasProp } from "../../common/index.js"
import BaseFile from "../base/file.js"


export class BareFile extends BaseFile {

  depot: Depot.Implementation

  constructor(depot: Depot.Implementation, content: Uint8Array) {
    super(content)
    this.depot = depot
  }

  static create(depot: Depot.Implementation, content: Uint8Array): BareFile {
    return new BareFile(depot, content)
  }

  static async fromCID(depot: Depot.Implementation, cid: CID): Promise<BareFile> {
    const content = await Protocol.basic.getFile(depot, cid)
    return new BareFile(depot, content)
  }

  static instanceOf(obj: unknown): obj is BareFile {
    return isObject(obj) && hasProp(obj, "content")
  }

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async putDetailed(): Promise<PutResult> {
    return Protocol.basic.putFile(
      this.depot,
      this.content
    )
  }
}


export default BareFile
