import PublicFile from '../public/file'
import { CID, FileContent } from '../../ipfs'
import { SemVer, Header } from '../types'
import normalizer from '../normalizer'
import header from '../header'


class PrivateFile extends PublicFile {

  constructor(content: FileContent, header: Header) {
    super(content, header)
  }

  static create(content: FileContent, version: SemVer): PrivateFile {
    return new PrivateFile(content, { 
      ...header.empty(),
      version
    })
  }

  static async fromCID(cid: CID, parentKey?: string): Promise<PublicFile> {
    if(parentKey === undefined){
      throw new Error("This is a private file. Use PrivateFile.fromCIDWithKey")
    }
    const content = await normalizer.getFile(cid, parentKey)
    const header = await normalizer.getHeader(cid, parentKey)
    return new PrivateFile(content, header)
  }

  put(): Promise<CID> {
    throw new Error("This is a private file. Use PrivateFile.putEncrypted")
  }

  async putEncrypted(key: string): Promise<CID> {
    return normalizer.putFile(this.header.version, this.content, {}, key)
  }

}


export default PrivateFile
