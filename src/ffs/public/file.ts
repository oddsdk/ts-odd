import { File } from '../types'
import ipfs, { CID, FileContent } from '../../ipfs'

class PublicFile implements File {

  isFile = true
  content: FileContent

  constructor(content: FileContent) {
    this.content = content
  }

  static create(content: FileContent): PublicFile {
    return new PublicFile(content)
  }

  static async fromCID(cid: CID): Promise<PublicFile> {
    const content = await ipfs.catBuf(cid)
    return new PublicFile(content)
  }

  put(): Promise<CID> {
    return ipfs.add(this.content)
  }

}

export default PublicFile
