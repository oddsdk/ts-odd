import { FileInfo, FileHeader, PutDetails } from "../protocol/public/types.js"
import { CID, FileContent } from "../../ipfs/index.js"
import BaseFile from "../base/file.js"
import PublicHistory from "./PublicHistory.js"
import * as check from "../types/check.js"
import * as history from "./PublicHistory.js"
import * as metadata from "../metadata.js"
import * as protocol from "../protocol/index.js"
import * as version from "../version.js"
import { isObject, Maybe } from "../../common/index.js"


type ConstructorParams = {
  cid: Maybe<CID>
  content: FileContent
  header: FileHeader
}

export class PublicFile extends BaseFile {

  cid: Maybe<CID>
  header: FileHeader
  history: PublicHistory

  constructor({ content, header, cid }: ConstructorParams) {
    super(content)

    this.cid = cid
    this.header = header
    this.history = new PublicHistory(this as unknown as history.Node)
  }

  static instanceOf(obj: unknown): obj is PublicFile {
    return isObject(obj)
      && obj.content !== undefined
      && check.isFileHeader(obj.header)
  }

  static async create(content: FileContent): Promise<PublicFile> {
    return new PublicFile({
      content,
      header: { metadata: metadata.empty(true, version.publicFileVersion) },
      cid: null
    })
  }

  static async fromCID(cid: CID): Promise<PublicFile> {
    const info = await protocol.pub.get(cid)
    return PublicFile.fromInfo(info, cid)
  }

  static async fromInfo(info: FileInfo, cid: CID): Promise<PublicFile> {
    const { userland, metadata, previous } = info
    const content = await protocol.basic.getFile(userland)
    return new PublicFile({
      content,
      header: { metadata, previous },
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
