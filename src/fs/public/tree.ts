import header from '../header'
import { Tree, File, SemVer, Header, NodeInfo } from '../types'
import check from '../types/check'
import { CID, FileContent } from '../../ipfs'
import BaseTree from '../basetree'
import { constructors as PublicFileConstructors } from './file'
import normalizer from '../normalizer'
import { removeKeyFromObj, Maybe, updateOrRemoveKeyFromObj, isJust } from '../../common'
import link from '../link'
import semver from '../semver'

export class PublicTree extends BaseTree implements Tree {

  protected header: Header

  constructor(header: Header) {
    super(header.version, link.fromNodeMap(header.cache))
    this.header = header
  }

  // static instanceOf(obj: any): obj is PublicTree {
  //   return obj.getDirectChild !== undefined
  // }

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
    return normalizer.putTree(this.header, null)
  }

  async updateDirectChild(child: Tree | File, name: string): Promise<Tree> {
    const cid = await child.put()
    return this.updateHeader(name, {
      ...child.getHeader(),
      cid,
      isFile: check.isFile(child)
    })
  }

  async removeDirectChild(name: string): Promise<Tree> {
    return this.updateHeader(name, null)
  }

  async getDirectChild(name: string): Promise<Tree | File | null> {
    return normalizer.getDirectChild(this, name)
  }

  async getOrCreateDirectChild(name: string): Promise<Tree | File> {
    const child = await this.getDirectChild(name)
    return child ? child : this.createEmptyTree()
  }

  async updateHeader(name: string, childInfo: Maybe<NodeInfo>): Promise<Tree> {
    const { cache } = this.header
    if(isJust(childInfo)){
      childInfo.name = name
    }
    const updatedCache = updateOrRemoveKeyFromObj(cache, name, childInfo)
    const sizeDiff = (childInfo?.size || 0) - (cache[name]?.size || 0)

    return this.copyWithHeader({
      ...this.header,
      cache: updatedCache,
      size: this.header.size + sizeDiff,
    }) 
  }

  updateLink(info: NodeInfo): Tree {
    return this.copyWithHeader({
      ...this.header,
      cache: {
        ...this.header.cache,
        [info.name = '']: info
      }
    })
  }

  findLink(name: string): NodeInfo | null {
    return this.header.cache[name] || null
  }

  findLinkCID(name: string): CID | null {
    return this.findLink(name)?.cid || null
  }

  rmLink(name: string): Tree {
    return this.copyWithHeader({
      ...this.header,
      cache: removeKeyFromObj(this.header.cache, name)
    })
  }

  copyWithHeader(header: Header): Tree {
    return new PublicTree(header)
  }

  getHeader(): Header {
    return this.header
  }

}

export const empty = async (version: SemVer, _key?: string): Promise<PublicTree> => {
  return new PublicTree({
    ...header.empty(),
    version,
  })
}

export const fromCID = async (cid: CID, _key?: string): Promise<PublicTree> => {
  const header = await normalizer.getHeader(cid, null)
  return new PublicTree(header) 
}

export const fromHeader = async (header: Header): Promise<PublicTree> => {
  return new PublicTree(header) 
}

export const constructors = { empty, fromCID, fromHeader }


export default PublicTree
