import {  PutDetails, File } from '../types'
import { FileInfo, FileHeader } from '../protocol/public/types'
import { CID, FileContent } from '../../ipfs'
import BaseFile from '../base/file'
import * as metadata from '../metadata'
import * as protocol from '../protocol'


type ConstructorParams = {
  content: FileContent, 
  info: FileHeader
}

export class PublicFile extends BaseFile implements File {

  info: FileHeader

  constructor({ content, info }: ConstructorParams) {
    super(content)
    this.info = info
  }

  static async create(content: FileContent): Promise<PublicFile> {
    return new PublicFile({
      content, 
      info: {
        metadata: { 
          ...metadata.empty(),
          isFile: true,
        }
      }
    })
  }

  static async fromCID(cid: CID): Promise<PublicFile> {
    const info = await protocol.pub.get(cid)
    return PublicFile.fromInfo(info)
  }

  static async fromInfo(info: FileInfo): Promise<PublicFile> {
    const { userland, metadata } = info
    const content = await protocol.basic.getFile(userland)
    return new PublicFile({ content, info: { metadata } })
  }

  async putDetailed(): Promise<PutDetails> {
    return protocol.pub.putFile(this.content, {
      ...this.info.metadata,
      mtime: Date.now()
    })
  }

}

export default PublicFile
