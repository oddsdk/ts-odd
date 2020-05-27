import { File, SemVer, Header } from '../types'
import { CID, FileContent } from '../../ipfs'
import normalizer from '../normalizer'
import semver from '../semver'


class PublicFile implements File {

  isFile = true
  content: FileContent
  protected header: Header

  constructor(content: FileContent, header: Header) {
    this.content = content
    this.header = header
  }

  static create(content: FileContent, version: SemVer = semver.latest): PublicFile {
    return new PublicFile(content, { version })
  }

  static async fromCID(cid: CID): Promise<PublicFile> {
    const version = await normalizer.getVersion(cid, null)
    const content = await normalizer.getFile(cid, null)
    return new PublicFile(content, { version })
  }

  put(): Promise<CID> {
    return normalizer.putFile(this.header.version, this.content, {}, null)
  }

  getHeader(): Header {
    return this.header
  }

}


export default PublicFile
