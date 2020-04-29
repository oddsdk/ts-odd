import PublicFile from '../public/file'
import { CID, FileContent } from '../../ipfs'
import { SemVer } from '../types'
import normalizer from '../normalizer'
import semver from '../semver'


class PrivateFile extends PublicFile {

  constructor(content: FileContent, version: SemVer) {
    super(content, version)
  }

  static create(content: FileContent, version: SemVer = semver.latest): PrivateFile {
    return new PrivateFile(content, version)
  }

  static async fromCID(_cid: CID): Promise<PublicFile> {
    throw new Error("This is a private file. Use PrivateFile.fromCIDWithKey")
  }

  static async fromCIDWithKey(cid: CID, key: string): Promise<PrivateFile> {
    const version = await normalizer.getVersion(cid, key)
    const content = await normalizer.getFile(cid, key)
    return new PrivateFile(content, version)
  }


  put(): Promise<CID> {
    throw new Error("This is a private file. Use PrivateFile.putEncrypted")
  }

  async putEncrypted(key: string): Promise<CID> {
    return normalizer.putFile(this.version, this.content, {}, key)
  }

}


export default PrivateFile
