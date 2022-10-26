import type { CID } from "multiformats/cid"

import * as protocol from "../protocol/index.js"
import { PutResult } from "../../components/depot/implementation.js"
import { isObject, hasProp } from "../../common/index.js"
import BaseFile from "../base/file.js"


export class BareFile extends BaseFile {

  static create(content: Uint8Array): BareFile {
    return new BareFile(content)
  }

  static async fromCID(cid: CID): Promise<BareFile> {
    const content = await protocol.basic.getFile(cid)
    return new BareFile(content)
  }

  static instanceOf(obj: unknown): obj is BareFile {
    return isObject(obj) && hasProp(obj, "content")
  }

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async putDetailed(): Promise<PutResult> {
    return protocol.basic.putFile(await protocol.pub.normalizeFileContent(this.content))
  }
}


export default BareFile
