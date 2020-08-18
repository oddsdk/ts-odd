import {  PutDetails, Metadata } from '../types'
import { CID, FileContent } from '../../ipfs'
import * as check from '../protocol/private/types/check'
import * as metadata from '../metadata'
import * as protocol from '../protocol'
import { AESKey, BareNameFilter, PrivateFileInfo } from '../protocol/private/types'

type ConstructorParams = {
  content: FileContent, 
  metadata: Metadata,
  bareNameFilter: BareNameFilter,
  revision: number,
  key: AESKey
}

export class PrivateFile {

  content: FileContent

  metadata: Metadata
  bareNameFilter: BareNameFilter
  revision: number
  key: AESKey


  constructor({ content, metadata, bareNameFilter, revision, key }: ConstructorParams) {
    this.content = content
    this.metadata = metadata
    this.bareNameFilter = bareNameFilter
    this.revision = revision
    this.key = key
  }

  static async create(content: FileContent, bareNameFilter: BareNameFilter,  key: AESKey): Promise<PrivateFile> {
    return new PrivateFile({ 
      content,
      bareNameFilter,
      key,
      revision: 1,
      metadata: {
        ...metadata.empty(),
        isFile: true,
      }
    })
  }

  static async fromCID(cid: CID, key: AESKey): Promise<PrivateFile> {
    const info = await protocol.priv.readNode(cid, key)
    if(!check.isPrivateFileInfo(info)) {
      throw new Error(`Could not parse a valid private file at: ${cid}`)
    }
    return PrivateFile.fromInfo(info)
  }

  static async fromInfo(info: PrivateFileInfo): Promise<PrivateFile> {
    const content = await protocol.basic.getEncryptedFile(info.content, info.key)
    return new PrivateFile({
      ...info,
      content,
    })
  }

  // @@TODO: use private method
  async putDetailed(): Promise<PutDetails> {
    return protocol.pub.putFile(this.content, {
      ...this.metadata,
      mtime: Date.now()
    })
  }

}

export default PrivateFile
