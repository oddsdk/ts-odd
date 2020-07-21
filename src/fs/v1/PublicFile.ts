import { HeaderV1, HeaderFile, PutDetails } from '../types'
import { CID, FileContent } from '../../ipfs'
import { Maybe } from '../../common'
import BaseFile from '../base/file'
import * as header from'./header'
import * as protocol from '../protocol'
import * as link from '../link'
import * as semver from '../semver'


export class PublicFile extends BaseFile implements HeaderFile {

  protected header: HeaderV1
  parentKey: Maybe<string>

  constructor(content: FileContent, header: HeaderV1, parentKey: Maybe<string>) {
    super(content)
    this.header = header
    this.parentKey = parentKey
  }

  static async create(content: FileContent, parentKey: Maybe<string>): Promise<HeaderFile> {
    return new PublicFile(content, { 
      ...header.empty(),
      isFile: true,
      version: semver.v1
    }, parentKey)
  }

  static async fromCID(cid: CID, parentKey: Maybe<string>): Promise<HeaderFile> {
    const info = await header.getHeaderAndUserland(cid, null)
    return PublicFile.fromHeaderAndUserland(info.header, info.userland, parentKey)
  }

  static async fromHeaderAndUserland(header: HeaderV1, userland: CID, parentKey: Maybe<string>): Promise<HeaderFile> {
    const content = await protocol.getFile(userland, header.key)
    return new PublicFile(content, header, parentKey)
  }

  async putDetailed(): Promise<PutDetails> {
    return this.putWithKey(null)
  }

  protected async putWithKey(key: Maybe<string>): Promise<PutDetails> {
    const { cid, size } = await protocol.putFile(this.content, this.header.key)
    const userlandCID = link.make('userland', cid, true, size)
    return header.put(userlandCID, {
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
