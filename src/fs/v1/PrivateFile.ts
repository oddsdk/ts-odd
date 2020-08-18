import { File } from '../types'
import { CID, FileContent } from '../../ipfs'
import * as check from '../protocol/private/types/check'
import * as metadata from '../metadata'
import * as protocol from '../protocol'
import * as namefilter from '../protocol/private/namefilter'
import { BareNameFilter } from '../protocol/private/namefilter'
import MMPT from '../protocol/private/mmpt'
import { PrivateAddResult, PrivateFileInfo } from '../protocol/private/types'
import { isObject } from '../../common/type-checks'
import BaseFile from '../base/file'

type ConstructorParams = {
  mmpt: MMPT,
  content: FileContent, 
  info: PrivateFileInfo
}

export class PrivateFile extends BaseFile implements File {

  mmpt: MMPT
  info: PrivateFileInfo

  constructor({ mmpt, content, info }: ConstructorParams) {
    super(content)
    this.mmpt = mmpt
    this.info = info
  }

  static instanceOf(obj: any): obj is PrivateFile {
    return isObject(obj)
      && obj.content !== undefined
      && obj.mmpt !== undefined
      && check.isPrivateFileInfo(obj.info)
  }

  static async create(mmpt: MMPT, content: FileContent, parentNameFilter: BareNameFilter,  key: string): Promise<PrivateFile> {
    const bareNameFilter = await namefilter.addToBare(parentNameFilter, key)
    const contentInfo = await protocol.basic.putEncryptedFile(content, key)
    return new PrivateFile({ 
      mmpt,
      content,
      info: {
        bareNameFilter,
        key,
        revision: 1,
        metadata: {
          ...metadata.empty(),
          isFile: true,
        },
        content: contentInfo.cid
      }
    })
  }

  static async fromCID(mmpt: MMPT, cid: CID, key: string): Promise<PrivateFile> {
    const info = await protocol.priv.getByCID(mmpt, cid, key)
    if(!check.isPrivateFileInfo(info)) {
      throw new Error(`Could not parse a valid private tree at: ${cid}`)
    }
    const content = await protocol.basic.getEncryptedFile(info.content, info.key)
    return new PrivateFile({ mmpt, info, content })
  }

  async updateParentNameFilter(parentNameFilter: BareNameFilter): Promise<this> {
    this.info.bareNameFilter = await namefilter.addToBare(parentNameFilter, this.info.key)
    return this
  }

  static async fromInfo(mmpt: MMPT, info: PrivateFileInfo): Promise<PrivateFile> {
    const content = await protocol.basic.getEncryptedFile(info.content, info.key)
    return new PrivateFile({
      mmpt,
      info,
      content,
    })
  }

  async putDetailed(): Promise<PrivateAddResult> {
    return protocol.priv.addNode(this.mmpt, {
      ...this.info, 
      metadata: {
        ...this.info.metadata,
        mtime: Date.now()
      }
    }, this.info.key)
  }

}

export default PrivateFile
