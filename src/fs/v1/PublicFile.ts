import { HeaderV1, HeaderFile, PutDetails } from '../types'
import { CID, FileContent } from '../../ipfs'
import BaseFile from '../base/file'
import * as header from'./header'
import * as protocol from '../protocol'
import * as link from '../link'
import * as semver from '../semver'


export class PublicFile extends BaseFile implements HeaderFile {

  protected header: HeaderV1

  constructor(content: FileContent, header: HeaderV1) {
    super(content)
    this.header = header
  }

  static async create(content: FileContent): Promise<HeaderFile> {
    return new PublicFile(content, { 
      ...header.empty(),
      isFile: true,
      version: semver.v1
    })
  }

  static async fromCID(cid: CID): Promise<HeaderFile> {
    const info = await header.getHeaderAndUserland(cid)
    return PublicFile.fromHeaderAndUserland(info.header, info.userland)
  }

  static async fromHeaderAndUserland(header: HeaderV1, userland: CID): Promise<HeaderFile> {
    const content = await protocol.getFile(userland, null)
    return new PublicFile(content, header)
  }

  async putDetailed(): Promise<PutDetails> {
    const { cid, size } = await protocol.putFile(this.content, null)
    const userlandCID = link.make('userland', cid, true, size)
    return header.put(userlandCID, {
      ...this.header,
      size,
      mtime: Date.now()
    })
  }

  getHeader(): HeaderV1 {
    return this.header
  }

}

export default PublicFile
