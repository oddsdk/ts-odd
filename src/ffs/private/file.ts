import PublicFile from '../public/file'
import util from './util'
import ipfs, { CID, FileContent } from '../../ipfs'
import { FileSystemVersion } from '../types'

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
    const encrypted = await ipfs.catBuf(cid)
    const content = await util.decryptContent(encrypted, key)
    return new PrivateFile(content, FileSystemVersion.v1_0_0)
  }


  put(): Promise<CID> {
    throw new Error("This is a private file. Use PrivateFile.putEncrypted")
  }

  async putEncrypted(key: string): Promise<CID> {
    const encrypted = await util.encryptContent(this.content, key)
    return ipfs.add(encrypted)
  }

}

export default PrivateFile
