import type { CID } from "multiformats/cid"

import { File } from "../types.js"
import { PutResult } from "../../components/depot/implementation.js"


export abstract class BaseFile implements File {

  content: Uint8Array
  readOnly: boolean

  constructor(content: Uint8Array) {
    this.content = content
    this.readOnly = false
  }

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async updateContent(content: Uint8Array): Promise<this> {
    if (this.readOnly) throw new Error("File is read-only")
    this.content = content
    return this
  }

  abstract putDetailed(): Promise<PutResult>
}


export default BaseFile
