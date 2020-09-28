import { FileInfo, FileHeader, PutDetails } from '../protocol/public/types'
import { CID, FileContent } from '../../ipfs'
import BaseFile from '../base/file'
import * as metadata from '../metadata'
import * as protocol from '../protocol'
import * as check from '../types/check'
import { isObject, Maybe } from '../../common'


type ConstructorParams = {
  content: FileContent, 
  header: FileHeader
  cid: Maybe<CID>
}

export class PublicFile extends BaseFile {

  header: FileHeader
  cid: Maybe<CID>

  constructor({ content, header, cid }: ConstructorParams) {
    super(content)
    this.header = header
    this.cid = cid
  }

  static instanceOf(obj: any): obj is PublicFile {
    return isObject(obj)
      && obj.content !== undefined
      && check.isFileHeader(obj.header)
  }

  static async create(content: FileContent): Promise<PublicFile> {
    return new PublicFile({
      content, 
      header: { metadata:  metadata.empty(true) },
      cid: null
    })
  }

  static async fromCID(cid: CID): Promise<PublicFile> {
    const info = await protocol.pub.get(cid)
    return PublicFile.fromInfo(info, cid)
  }

  static async fromInfo(info: FileInfo, cid: CID): Promise<PublicFile> {
    const { userland, metadata } = info
    const content = await protocol.basic.getFile(userland)
    return new PublicFile({ 
      content, 
      header: { metadata },
      cid
    })
  }

  async putDetailed(): Promise<PutDetails> {
    const details = await protocol.pub.putFile(
      this.content, 
      metadata.updateMtime(this.header.metadata),
      this.cid
    )
    this.cid = details.cid
    return details
  }

}

export default PublicFile
