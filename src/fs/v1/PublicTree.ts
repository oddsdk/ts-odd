import header from '../network/header'
import basic from '../network/basic'
import headerv1 from './header'
import { Links, Tree, File, SemVer, HeaderV1, NodeInfo } from '../types'
import check from '../types/check'
import { CID, FileContent } from '../../ipfs'
import BaseTree from '../base/tree'
import { constructors as PublicFileConstructors } from './PublicFile'
import { removeKeyFromObj, Maybe, updateOrRemoveKeyFromObj, isJust } from '../../common'
import link from '../link'
import semver from '../semver'

export class PublicTree extends BaseTree implements Tree {

  protected header: HeaderV1

  constructor(header: HeaderV1) {
    super(header.version)
    this.header = header
  }

  static instanceOf(obj: any): obj is PublicTree {
    return obj.header !== undefined
  }

  async createEmptyTree(): Promise<PublicTree> {
    return constructors.empty(semver.latest) // TODO: don't hardcode version
  }

  async createTreeFromCID(cid: CID): Promise<PublicTree> {
    return constructors.fromCID(cid)
  }

  createFile(content: FileContent): File {
    return PublicFileConstructors.create(content, semver.latest) // TODO: don't hardcode version
  }

  async createFileFromCID(cid: CID): Promise<File> {
    return PublicFileConstructors.fromCID(cid)
  }

  async put(): Promise<CID> {
    return this.putWithKey(null)
  }
  
  protected async putWithKey(key: Maybe<string>): Promise<CID> {
    const links = link.fromNodeMap(this.header.fileIndex)
    const indexCID = await basic.putLinks(links, key)

    const size = Object.values(this.header.fileIndex || {})
                .reduce((acc, cur) => acc + cur.size, 0)

    return header.put(indexCID, {
      ...this.header,
      size,
      mtime: Date.now()
    }, key)
  }

  async updateDirectChild(child: Tree | File, name: string): Promise<this> {
    const cid = await child.put()
    return this.updateHeader(name, {
      ...child.getHeader(),
      cid,
      isFile: check.isSimpleFile(child)
    })
  }

  async removeDirectChild(name: string): Promise<this> {
    return this.updateHeader(name, null)
  }

  async getDirectChild(name: string): Promise<Tree | File | null> {
    const childHeader = this.findLink(name)
    if(childHeader === null) return null
    return childHeader.isFile
          ? PublicFileConstructors.fromCID(childHeader.cid)
          : constructors.fromHeader(childHeader)
  }

  async getOrCreateDirectChild(name: string): Promise<Tree | File> {
    const child = await this.getDirectChild(name)
    return child ? child : this.createEmptyTree()
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

// CONSTRUCTORS

export const empty = async (version: SemVer, _key?: string): Promise<PublicTree> => {
  return new PublicTree({
    ...headerv1.empty(),
    version,
  })
}

export const fromCID = async (cid: CID): Promise<PublicTree> => {
  const info = await headerv1.getHeaderAndIndex(cid, null)
  return new PublicTree(info.header) 
}

export const fromHeader = async (header: HeaderV1): Promise<PublicTree> => {
  return new PublicTree(header) 
}

export const constructors = { empty, fromCID, fromHeader }


export default PublicTree
