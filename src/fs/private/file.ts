import PublicFile from '../public/file'
import { CID, FileContent } from '../../ipfs'
import { SemVer, Header } from '../types'
import normalizer from '../normalizer'
import semver from '../semver'
import header from '../header'


class PrivateFile extends PublicFile {

  constructor(content: FileContent, header: Header) {
    super(content, header)
  }

  static create(content: FileContent, version: SemVer = semver.latest): PrivateFile {
    return new PrivateFile(content, { 
      ...header.empty(),
      version
    })
  }

  static async fromCID(_cid: CID): Promise<PublicFile> {
    throw new Error("This is a private file. Use PrivateFile.fromCIDWithKey")
  }

  static async fromCIDWithKey(cid: CID, key: string): Promise<PrivateFile> {
    const content = await normalizer.getFile(cid, key)
    const header = await normalizer.getHeader(cid, key)
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
