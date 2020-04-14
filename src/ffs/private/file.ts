import PublicFile from '../public/file'
import { CID, FileContent } from '../../ipfs'
import { FileSystemVersion } from '../types'
import normalizer from '../normalizer'

class PrivateFile extends PublicFile {
  
  constructor(content: FileContent, version: FileSystemVersion) {
    super(content, version)
  }

  static create(content: FileContent, version: FileSystemVersion = FileSystemVersion.v1_0_0): PrivateFile {
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
