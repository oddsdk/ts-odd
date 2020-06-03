import { File, SemVer, Header } from '../types'
import { CID, FileContent } from '../../ipfs'
import normalizer from '../normalizer'
import header from '../header'


class PublicFile implements File {

  content: FileContent
  protected header: Header

  constructor(content: FileContent, header: Header) {
    this.content = content
    this.header = header
  }

  static create(content: FileContent, version: SemVer): PublicFile {
    return new PublicFile(content, { 
      ...header.empty(),
      isFile: true,
      version 
    })
  }

  static async fromCID(cid: CID, _key?: string): Promise<PublicFile> {
    const header = await normalizer.getHeader(cid, null)
    const content = await normalizer.getFile(cid, null)
    return new PublicFile(content, {
      ...header,
      isFile: true
    })
  }

  put(): Promise<CID> {
    return normalizer.putFile(this.header.version, this.content, {}, null)
  }

  getHeader(): Header {
    return this.header
  }

}


export default PublicFile
