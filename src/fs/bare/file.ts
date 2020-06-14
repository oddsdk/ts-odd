import { CID, FileContent } from '../../ipfs'
import basic from '../network/basic'
import BaseFile from '../base/file'


export class BareFile extends BaseFile {

  static create(content: FileContent): BareFile {
    return new BareFile(content)
  }

  static async fromCID(cid: CID): Promise<BareFile> {
    const content = await basic.getFile(cid)
    return new BareFile(content)
  }

  async put(): Promise<CID> {
    const { cid } = await  basic.putFile(this.content)
    return cid
  }
}


export default BareFile
