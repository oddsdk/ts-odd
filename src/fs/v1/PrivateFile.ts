import BaseFile from '../base/file'
import MMPT from '../protocol/private/mmpt'
import PrivateHistory from './PrivateHistory'
import { FileContent } from '../../ipfs'
import { PrivateName, BareNameFilter } from '../protocol/private/namefilter'
import { PrivateAddResult, PrivateFileInfo } from '../protocol/private/types'
import { isObject } from '../../common/type-checks'
import * as crypto from '../../crypto'
import * as check from '../protocol/private/types/check'
import * as history from './PrivateHistory'
import * as metadata from '../metadata'
import * as protocol from '../protocol'
import * as namefilter from '../protocol/private/namefilter'


type ConstructorParams = {
  content: FileContent
  key: string
  header: PrivateFileInfo
  mmpt: MMPT
}


export class PrivateFile extends BaseFile {

  header: PrivateFileInfo
  history: PrivateHistory
  key: string
  mmpt: MMPT

  constructor({ content, mmpt, key, header }: ConstructorParams) {
    super(content)

    this.header = header
    this.history = new PrivateHistory(this as unknown as history.Node)
    this.key = key
    this.mmpt = mmpt
  }

  static instanceOf(obj: any): obj is PrivateFile {
    return isObject(obj)
      && obj.content !== undefined
      && obj.mmpt !== undefined
      && check.isPrivateFileInfo(obj.header)
  }

  static async create(mmpt: MMPT, content: FileContent, parentNameFilter: BareNameFilter,  key: string): Promise<PrivateFile> {
    const bareNameFilter = await namefilter.addToBare(parentNameFilter, key)
    const contentKey = await crypto.aes.genKeyStr()
    const contentInfo = await protocol.basic.putEncryptedFile(content, contentKey)
    return new PrivateFile({
      content,
      mmpt,
      key,
      header: {
        bareNameFilter,
        key: contentKey,
        revision: 1,
        metadata: metadata.empty(true),
        content: contentInfo.cid
      }
    })
  }

  static async fromLatestName(mmpt: MMPT, name: PrivateName, key: string): Promise<PrivateFile> {
    const info = await protocol.priv.getByLatestName(mmpt, name, key)

    if (!check.isPrivateFileInfo(info)) {
      throw new Error(`Could not parse a valid private file using the given key`)
    }

    return PrivateFile.fromInfo(mmpt, key, info)
  }

  static async fromName(mmpt: MMPT, name: PrivateName, key: string): Promise<PrivateFile> {
    const info = await protocol.priv.getByName(mmpt, name, key)

    if (!check.isPrivateFileInfo(info)) {
      throw new Error(`Could not parse a valid private file using the given key`)
    }

    return PrivateFile.fromInfo(mmpt, key, info)
  }

  static async fromInfo(mmpt: MMPT, key: string, info: PrivateFileInfo): Promise<PrivateFile> {
    const content = await protocol.basic.getEncryptedFile(info.content, info.key)
    return new PrivateFile({
      content,
      key,
      mmpt,
      header: info
    })
  }

  async getName(): Promise<PrivateName> {
    const { bareNameFilter, revision } = this.header
    const revisionFilter = await namefilter.addRevision(bareNameFilter, this.key, revision)
    return namefilter.toPrivateName(revisionFilter)
  }

  async updateParentNameFilter(parentNameFilter: BareNameFilter): Promise<this> {
    this.header.bareNameFilter = await namefilter.addToBare(parentNameFilter, this.header.key)
    return this
  }

  async updateContent(content: FileContent): Promise<this> {
    const contentInfo = await protocol.basic.putEncryptedFile(content, this.header.key)
    this.content = content
    this.header = {
      ...this.header,
      revision: this.header.revision + 1,
      content: contentInfo.cid
    }
    return this
  }

  async putDetailed(): Promise<PrivateAddResult> {
    return protocol.priv.addNode(this.mmpt, {
      ...this.header,
      metadata: metadata.updateMtime(this.header.metadata)
    }, this.key)
  }

}

export default PrivateFile
