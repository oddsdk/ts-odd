import { AddResult, CID, FileContent } from '../../ipfs'
import * as protocol from '../protocol'
import BaseFile from '../base/file'


export class BareFile extends BaseFile {

  static create(content: FileContent): BareFile {
    return new BareFile(content)
  }

  static async fromCID(cid: CID): Promise<BareFile> {
    const content = await protocol.basic.getFile(cid)
    return new BareFile(content)
  }

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async putDetailed(): Promise<AddResult> {
    return protocol.basic.putFile(this.content)
  }
}


export default BareFile
