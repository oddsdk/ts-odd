/** @internal */
import { File } from '../types.js'
import { AddResult, CID, FileContent } from '../../ipfs/index.js'


export abstract class BaseFile implements File {

  content: FileContent

  constructor(content: FileContent) {
    this.content = content
  }

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async updateContent(content: FileContent): Promise<this> {
    this.content = content
    return this
  }

  abstract putDetailed(): Promise<AddResult>
}


export default BaseFile
