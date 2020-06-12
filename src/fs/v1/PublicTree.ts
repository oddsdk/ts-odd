import header from '../network/header'
import basic from '../network/basic'
import headerv1 from './header'
import { Links, Tree, HeaderV1, NodeInfo, PutResult, StaticMethods, HeaderTree, HeaderFile } from '../types'
import check from '../types/check'
import { CID, FileContent } from '../../ipfs'
import BaseTree from '../base/tree'
import PublicFile from './PublicFile'
import { removeKeyFromObj, Maybe, updateOrRemoveKeyFromObj, isJust } from '../../common'
import link from '../link'
import semver from '../semver'

export class PublicTree extends BaseTree implements HeaderTree {

  protected header: HeaderV1
  protected parentKey: Maybe<string>
  protected ownKey: Maybe<string> = null

  protected static: StaticMethods

  constructor(header: HeaderV1, parentKey: Maybe<string>) {
    super(header.version)
    this.parentKey = parentKey
    this.header = header
    this.static = {
      tree: PublicTree,
      file: PublicFile
    }
  }

  static async empty (parentKey: Maybe<string>): Promise<HeaderTree> {
    return new PublicTree({
      ...headerv1.empty(),
      version: semver.v1,
    }, parentKey)
}

  static async fromCID (cid: CID, parentKey: Maybe<string>): Promise<HeaderTree> {
    const info = await headerv1.getHeaderAndIndex(cid, null)
    return new PublicTree(info.header, parentKey)
  }

  static fromHeader (header: HeaderV1, parentKey: Maybe<string>): HeaderTree {
    return new PublicTree(header, parentKey) 
  }

  static instanceOf(obj: any): obj is PublicTree {
    return obj.header !== undefined
  }

  async emptyChildTree(): Promise<HeaderTree> {
    return this.static.tree.empty(this.ownKey)
  }

  async childTreeFromCID(cid: CID): Promise<HeaderTree> {
    return this.static.tree.fromCID(cid, this.ownKey)
  }

  childTreeFromHeader(header: HeaderV1): HeaderTree {
    return this.static.tree.fromHeader(header, this.ownKey)
  }

  async createChildFile(content: FileContent): Promise<HeaderFile> {
    return this.static.file.create(content, this.ownKey)
  }

  async childFileFromCID(cid: CID): Promise<HeaderFile> {
    return this.static.file.fromCID(cid, this.ownKey)
  }

  async put(): Promise<CID> {
    const { cid } = await this.putWithPins()
    return cid
  }
  
  async putWithPins(): Promise<PutResult> {
    return this.putWithKey(this.parentKey)
  }
 
  protected async putWithKey(key: Maybe<string>): Promise<PutResult> {
    const links = link.fromNodeMap(this.header.fileIndex)
    const indexCID = await basic.putLinks(links, this.header.key)

    const size = Object.values(this.header.fileIndex || {})
                .reduce((acc, cur) => acc + cur.size, 0)

    return header.put(indexCID, {
      ...this.header,
      size,
      mtime: Date.now()
    }, key)
  }

  async updateDirectChild(child: HeaderTree | HeaderFile, name: string): Promise<this> {
    const { cid, pins } = await child.putWithPins()
    return this
            .updatePins(name, pins)
            .updateHeader(name, {
              ...child.getHeader(),
              cid,
              isFile: check.isFile(child)
            })
  }

  async removeDirectChild(name: string): Promise<this> {
    return this
            .updatePins(name, null)
            .updateHeader(name, null)
  }

  async getDirectChild(name: string): Promise<HeaderTree | HeaderFile | null> {
    const childHeader = this.findLink(name)
    if(childHeader === null) return null
    return childHeader.isFile
          ? this.childFileFromCID(childHeader.cid)
          : this.childTreeFromHeader(childHeader)
  }

  async getOrCreateDirectChild(name: string): Promise<HeaderTree | HeaderFile> {
    const child = await this.getDirectChild(name)
    return child ? child : this.emptyChildTree()
  }

  async updateHeader(name: string, childInfo: Maybe<NodeInfo>): Promise<this> {
    const { fileIndex } = this.header
    if(isJust(childInfo)){
      childInfo.name = name
    }
    const updatedFileIndex = updateOrRemoveKeyFromObj(fileIndex, name, childInfo)
    const sizeDiff = (childInfo?.size || 0) - (fileIndex[name]?.size || 0)

    this.header = {
      ...this.header,
      fileIndex: updatedFileIndex,
      size: this.header.size + sizeDiff,
    }
    return this
  }

  updatePins(name: string, pins: Maybe<CID[]>): this {
    this.header.pins = updateOrRemoveKeyFromObj(this.header.pins, name, pins)
    return this
  }

  updateLink(info: NodeInfo): Tree {
    this.header = {
      ...this.header,
      fileIndex: {
        ...this.header.fileIndex,
        [info.name = '']: info
      }
    }
    return this
  }

  findLink(name: string): NodeInfo | null {
    return this.header.fileIndex[name] || null
  }

  findLinkCID(name: string): CID | null {
    return this.findLink(name)?.cid || null
  }

  rmLink(name: string): Tree {
    this.header = {
      ...this.header,
      fileIndex: removeKeyFromObj(this.header.fileIndex, name)
    }
    return this
  }

  getLinks(): Links {
    return link.fromNodeMap(this.header.fileIndex)
  }

  getHeader(): HeaderV1 {
    return this.header
  }

}


export default PublicTree
