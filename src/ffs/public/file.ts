import { File, FileSystemVersion } from '../types'
import { CID, FileContent } from '../../ipfs'
import resolver from './resolver'

class PublicFile implements File {

  isFile = true
  content: FileContent
  version: FileSystemVersion

  constructor(content: FileContent, version: FileSystemVersion) {
    this.content = content
    this.version = version
  }

  static create(content: FileContent, version: FileSystemVersion = FileSystemVersion.v1_0_0): PublicFile {
    return new PublicFile(content, version)
  }

  static async fromCID(cid: CID): Promise<PublicFile> {
    const version = await resolver.getVersion(cid)
    const content = await resolver.getFile(cid)
    return new PublicFile(content, version)
  }

  put(): Promise<CID> {
    return resolver.putFile(this.version, this.content)
  }

}

export default PublicFile
