import PublicFile from '../public/file'
import util from './util'
import ipfs, { CID, FileContent } from '../../ipfs'

class PrivateFile extends PublicFile {
  
  constructor(content: FileContent){
    super(content)
  }

  static create(content: FileContent): PrivateFile {
    return new PrivateFile(content)
  }

  static async fromCID(_cid: CID): Promise<PublicFile> {
    throw new Error("This is a private file. Use PrivateFile.fromCIDWithKey")
  }

  static async fromCIDWithKey(cid: CID, key: string): Promise<PrivateFile> {
    const encrypted = await ipfs.catBuf(cid)
    const content = await util.decryptContent(encrypted, key)
    return new PrivateFile(content)
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
