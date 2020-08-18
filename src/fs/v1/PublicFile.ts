import {  PutDetails, Metadata, FileInfo, File } from '../types'
import { CID, FileContent } from '../../ipfs'
import BaseFile from '../base/file'
import * as metadata from '../metadata'
import * as protocol from '../protocol'
import * as semver from '../semver'


export class PublicFile extends BaseFile implements File {

  metadata: Metadata

  constructor(content: FileContent, metadata: Metadata) {
    super(content)
    this.metadata = metadata
  }

  static async create(content: FileContent): Promise<PublicFile> {
    return new PublicFile(content, { 
      ...metadata.empty(),
      isFile: true,
      version: semver.v1
    })
  }

  static async fromCID(cid: CID): Promise<PublicFile> {
    const info = await protocol.pub.get(cid)
    return PublicFile.fromInfo(info)
  }

  static async fromInfo(info: FileInfo): Promise<PublicFile> {
    const { userland, metadata } = info
    const content = await protocol.basic.getFile(userland)
    return new PublicFile(content, metadata)
  }

  async putDetailed(): Promise<PutDetails> {
    return protocol.pub.putFile(this.content, {
      ...this.metadata,
      mtime: Date.now()
    })
  }

}

export default PublicFile
