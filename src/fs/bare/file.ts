import { AddResult, CID, FileContent } from "../../ipfs/index.js"
import * as protocol from "../protocol/index.js"
import BaseFile from "../base/file.js"
import { isObject } from "../../common/index.js"


export class BareFile extends BaseFile {

  static create(content: FileContent): BareFile {
    return new BareFile(content)
  }

  static async fromCID(cid: CID): Promise<BareFile> {
    const content = await protocol.basic.getFile(cid)
    return new BareFile(content)
  }

  static instanceOf (obj: any): obj is BareFile {
    return isObject(obj) && obj.content !== undefined
  }

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async putDetailed(): Promise<AddResult> {
    return protocol.basic.putFile(await protocol.pub.normalizeFileContent(this.content))
  }
}


export default BareFile
