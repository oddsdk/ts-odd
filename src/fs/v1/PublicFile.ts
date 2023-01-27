import type { CID } from "multiformats/cid"

import * as Check from "../types/check.js"
import * as Depot from "../../components/depot/implementation.js"
import * as History from "./PublicHistory.js"
import * as Metadata from "../metadata.js"
import * as Protocol from "../protocol/index.js"
import * as Versions from "../versions.js"

import { FileInfo, FileHeader, PutDetails } from "../protocol/public/types.js"
import { decodeCID, isObject, hasProp, Maybe } from "../../common/index.js"
import BaseFile from "../base/file.js"
import PublicHistory from "./PublicHistory.js"


type ConstructorParams = {
  depot: Depot.Implementation

  cid: Maybe<CID>
  content: Uint8Array
  header: FileHeader
}

export class PublicFile extends BaseFile {

  depot: Depot.Implementation

  cid: Maybe<CID>
  header: FileHeader
  history: PublicHistory

  constructor({ depot, content, header, cid }: ConstructorParams) {
    super(content)

    this.depot = depot

    this.cid = cid
    this.header = header
    this.history = new PublicHistory(
      toHistoryNode(this)
    )

    function toHistoryNode(file: PublicFile): History.Node {
      return {
        ...file,
        fromCID: async (cid: CID) => toHistoryNode(
          await PublicFile.fromCID(depot, cid)
        )
      }
    }
  }

  static instanceOf(obj: unknown): obj is PublicFile {
    return isObject(obj)
      && hasProp(obj, "content")
      && hasProp(obj, "header")
      && Check.isFileHeader(obj.header)
  }

  static async create(depot: Depot.Implementation, content: Uint8Array): Promise<PublicFile> {
    return new PublicFile({
      depot,

      content,
      header: { metadata: Metadata.empty(true, Versions.latest) },
      cid: null
    })
  }

  static async fromCID(depot: Depot.Implementation, cid: CID): Promise<PublicFile> {
    const info = await Protocol.pub.get(depot, cid)
    return PublicFile.fromInfo(depot, info, cid)
  }

  static async fromInfo(depot: Depot.Implementation, info: FileInfo, cid: CID): Promise<PublicFile> {
    const { userland, metadata, previous } = info
    const content = await Protocol.basic.getFile(depot, decodeCID(userland))
    return new PublicFile({
      depot,

      content,
      header: { metadata, previous },
      cid
    })
  }

  async putDetailed(): Promise<PutDetails> {
    const details = await Protocol.pub.putFile(
      this.depot,
      this.content,
      Metadata.updateMtime(this.header.metadata),
      this.cid
    )
    this.cid = details.cid
    return details
  }

}

export default PublicFile
