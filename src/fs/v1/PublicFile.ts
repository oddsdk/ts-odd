import {  HeaderFile, PutDetails, Metadata, IpfsSerialized } from '../types'
import { CID, FileContent } from '../../ipfs'
import BaseFile from '../base/file'
import * as header from'./header'
import * as protocol from '../protocol'
import * as semver from '../semver'
import * as link from '../link'


export class PublicFile extends BaseFile implements HeaderFile {

  metadata: Metadata

  constructor(content: FileContent, metadata: Metadata) {
    super(content)
    this.metadata = metadata
  }

  static async create(content: FileContent): Promise<HeaderFile> {
    return new PublicFile(content, { 
      ...header.emptyMetadata(),
      isFile: true,
      version: semver.v1
    })
  }

  static async fromCID(cid: CID): Promise<HeaderFile> {
    const info = await header.getSerialized(cid)
    return PublicFile.fromSerialized(info)
  }

  static async fromSerialized(info: IpfsSerialized): Promise<HeaderFile> {
    const { userland, metadata } = info
    const content = await protocol.getFile(userland)
    return new PublicFile(content, metadata)
  }

  async putDetailed(): Promise<PutDetails> {
    const { cid, size } = await protocol.putFile(this.content)
    const userlandLink = link.make('userland', cid, true, size)
    return header.put(userlandLink, {
      metadata: {
        ...this.metadata,
        mtime: Date.now()
      }
    })
  }

}

export default PublicFile
