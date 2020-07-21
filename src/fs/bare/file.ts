import { AddResult, CID, FileContent } from '../../ipfs'
import * as protocol from '../protocol'
import BaseFile from '../base/file'


export class BareFile extends BaseFile {

  static create(content: FileContent): BareFile {
    return new BareFile(content)
  }

  static async fromCID(cid: CID): Promise<BareFile> {
    const content = await protocol.getFile(cid, null)
    return new BareFile(content)
  }

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async putDetailed(): Promise<AddResult> {
    return protocol.putFile(this.content, null)
  }
}


export default BareFile
