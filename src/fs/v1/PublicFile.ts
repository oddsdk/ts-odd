import { File, SemVer, HeaderV1 } from '../types'
import { CID, FileContent } from '../../ipfs'
import BaseFile from '../base/file'
import headerv1 from'./header'
import header from'../network/header'
import basic from '../network/basic'
import { Maybe } from '../../common'


export class PublicFile extends BaseFile implements File {

  protected header: HeaderV1

  constructor(content: FileContent, header: HeaderV1) {
    super(content)
    this.header = header
  }

  async put(): Promise<CID> {
    return this.putWithKey(null)
  }

  protected async putWithKey(key: Maybe<string>) {
    const { cid, size } = await basic.putFile(this.content, this.header.key)
    return header.put(cid, {
      ...this.header,
      size,
      mtime: Date.now()
    }, key)
  }

  getHeader(): HeaderV1 {
    return this.header
  }

}

// CONSTRUCTORS

export const create = (content: FileContent, version: SemVer): PublicFile => {
  return new PublicFile(content, { 
    ...headerv1.empty(),
    isFile: true,
    version 
  })
}

export const fromCID = async (cid: CID): Promise<PublicFile> => {
  const info = await headerv1.getHeaderAndIndex(cid, null)
  const content = await basic.getFile(info.index, null)
  return new PublicFile(content, info.header)
}

export const constructors = { create, fromCID }

export default PublicFile
