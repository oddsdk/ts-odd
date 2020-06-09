import { File, SemVer, Header } from '../types'
import { CID, FileContent } from '../../ipfs'
import normalizer from '../normalizer'
import header from '../header'


export class PublicFile implements File {

  content: FileContent
  protected header: Header

  constructor(content: FileContent, header: Header) {
    this.content = content
    this.header = header
  }

  put(): Promise<CID> {
    return normalizer.putFile(this.content, this.header, null)
  }

  getHeader(): Header {
    return this.header
  }

}

export const create = (content: FileContent, version: SemVer): PublicFile => {
  return new PublicFile(content, { 
    ...header.empty(),
    isFile: true,
    version 
  })
}

export const fromCID = async (cid: CID, _key?: string): Promise<PublicFile> => {
  const header = await normalizer.getHeader(cid, null)
  const content = await normalizer.getFile(cid, null)
  return new PublicFile(content, {
    ...header,
    isFile: true
  })
}

export const constructors = { create, fromCID }

export default PublicFile
