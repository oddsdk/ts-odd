/** @internal */
import { File } from "../types.js"
import { AddResult, CID, FileContent } from "../../ipfs/index.js"


export abstract class BaseFile implements File {

  content: FileContent
  readOnly: boolean

  constructor(content: FileContent) {
    this.content = content
    this.readOnly = false
  }

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async updateContent(content: FileContent): Promise<this> {
    if (this.readOnly) throw new Error("File is read-only")
    this.content = content
    return this
  }

  abstract putDetailed(): Promise<AddResult>
}


export default BaseFile
