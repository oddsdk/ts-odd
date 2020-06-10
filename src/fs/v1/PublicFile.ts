import { File, SemVer, Header } from '../types'
import { CID, FileContent } from '../../ipfs'
import BaseFile from '../base/file'
import header from'./header'
import headerUtil from'../network/header'
import basic from '../network/basic'
import { Maybe } from '../../common'


export class PublicFile extends BaseFile implements File {

  protected header: Header

  constructor(content: FileContent, header: Header) {
    super(content)
    this.header = header
  }

  async put(): Promise<CID> {
    return this.putWithKey(null)
  }

  protected async putWithKey(key: Maybe<string>) {
    const { cid, size } = await basic.putFile(this.content, key)
    return headerUtil.put(cid, {
      ...this.header,
      size,
      mtime: Date.now()
    }, key)
  }

  getHeader(): Header {
    return this.header
  }

}

// CONSTRUCTORS

export const create = (content: FileContent, version: SemVer): PublicFile => {
  return new PublicFile(content, { 
    ...header.empty(),
    isFile: true,
    version 
  })
}

export const fromCID = async (cid: CID): Promise<PublicFile> => {
  const info = await header.getHeaderAndIndex(cid, null)
  const content = await basic.getFile(info.index, null)
  return new PublicFile(content, info.header)
}

export const constructors = { create, fromCID }

export default PublicFile
