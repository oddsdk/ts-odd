import { File } from '../types'
import { FileContent } from '../../ipfs'
import * as check from '../protocol/private/types/check'
import * as metadata from '../metadata'
import * as protocol from '../protocol'
import * as namefilter from '../protocol/private/namefilter'
import { PrivateName, BareNameFilter } from '../protocol/private/namefilter'
import MMPT from '../protocol/private/mmpt'
import { PrivateAddResult, PrivateFileInfo } from '../protocol/private/types'
import { isObject } from '../../common/type-checks'
import BaseFile from '../base/file'
import { genKeyStr } from '../../keystore'

type ConstructorParams = {
  content: FileContent
  mmpt: MMPT
  key: string
  info: PrivateFileInfo
}

export class PrivateFile extends BaseFile implements File {

  mmpt: MMPT
  key: string
  info: PrivateFileInfo

  constructor({ content, mmpt, key, info }: ConstructorParams) {
    super(content)
    this.mmpt = mmpt
    this.key = key
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
    const contentKey = await genKeyStr()
    const contentInfo = await protocol.basic.putEncryptedFile(content, contentKey)
    return new PrivateFile({ 
      content,
      mmpt,
      key,
      info: {
        bareNameFilter,
        key: contentKey,
        revision: 1,
        metadata: metadata.empty(true),
        content: contentInfo.cid
      }
    })
  }

  static async fromName(mmpt: MMPT, name: PrivateName, key: string): Promise<PrivateFile> {
    const info = await protocol.priv.getByName(mmpt, name, key)
    if(!check.isPrivateFileInfo(info)) {
      throw new Error(`Could not parse a valid private tree using the given key`)
    }
    return PrivateFile.fromInfo(mmpt, key, info)
  }

  static async fromInfo(mmpt: MMPT, key: string, info: PrivateFileInfo): Promise<PrivateFile> {
    const content = await protocol.basic.getEncryptedFile(info.content, info.key)
    return new PrivateFile({
      content,
      key,
      mmpt,
      info,
    })
  }

  async getName(): Promise<PrivateName> {
    const { bareNameFilter, revision } = this.info
    const revisionFilter = await namefilter.addRevision(bareNameFilter, this.key, revision)
    return namefilter.toPrivateName(revisionFilter)
  }

  async updateParentNameFilter(parentNameFilter: BareNameFilter): Promise<this> {
    this.info.bareNameFilter = await namefilter.addToBare(parentNameFilter, this.info.key)
    return this
  }

  async updateContent(content: FileContent): Promise<this> {
    const contentInfo = await protocol.basic.putEncryptedFile(content, this.info.key)
    this.info = {
      ...this.info,
      revision: this.info.revision + 1,
      content: contentInfo.cid
    }
    return this
  }

  async putDetailed(): Promise<PrivateAddResult> {
    return protocol.priv.addNode(this.mmpt, {
      ...this.info, 
      metadata: metadata.updateMtime(this.info.metadata)
    }, this.key)
  }

}

export default PrivateFile
