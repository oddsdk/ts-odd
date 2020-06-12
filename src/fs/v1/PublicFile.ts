import { File, HeaderV1, PutResult } from '../types'
import { CID, FileContent } from '../../ipfs'
import BaseFile from '../base/file'
import headerv1 from'./header'
import header from'../network/header'
import basic from '../network/basic'
import { Maybe } from '../../common'
import semver from '../semver'


export class PublicFile extends BaseFile implements File {

  protected header: HeaderV1
  protected parentKey: Maybe<string>

  constructor(content: FileContent, header: HeaderV1, parentKey: Maybe<string>) {
    super(content)
    this.header = header
    this.parentKey = parentKey
  }

  static async create(content: FileContent, parentKey: Maybe<string>): Promise<File> {
    return new PublicFile(content, { 
      ...headerv1.empty(),
      isFile: true,
      version: semver.v1
    }, parentKey)
  }

  static async fromCID(cid: CID, parentKey: Maybe<string>): Promise<File> {
    const info = await headerv1.getHeaderAndIndex(cid, null)
    const content = await basic.getFile(info.index, null)
    return new PublicFile(content, info.header, parentKey)
  }

  async put(): Promise<CID> {
    const { cid } = await this.putWithPins()
    return cid
  }

  async putWithPins(): Promise<PutResult> {
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

export default PublicFile
