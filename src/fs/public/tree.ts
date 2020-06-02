import operations from '../operations'
import pathUtil from '../path'
import link from '../link'
import header from '../header'
import { Link, Links, Tree, TreeData, TreeStatic, FileStatic, File, SemVer, Header, CacheData, NodeInfo } from '../types'
import check from '../types/check'
import { CID, FileContent } from '../../ipfs'
import PublicFile from './file'
import normalizer from '../normalizer'
import { removeKeyFromObj, Maybe, updateOrRemoveKeyFromObj, isJust } from '../../common'

class PublicTree implements Tree {

  isFile = false

  protected header: Header

  static: {
    tree: TreeStatic
    file: FileStatic
  }

  protected constructor(header: Header) {
    this.header = header
    this.static = {
      tree: PublicTree,
      file: PublicFile
    }
  }

  static instanceOf(obj: any): obj is PublicTree {
    return obj.getDirectChild !== undefined
  }

  static async empty(version: SemVer, _key?: string): Promise<PublicTree> {
    return new PublicTree({
      ...header.empty(),
      version,
    })
  }

  static async fromCID(cid: CID, _key?: string): Promise<PublicTree> {
    const header = await normalizer.getHeader(cid, null)
    return new PublicTree(header) 
  }

  async ls(path: string): Promise<Links> {
    const parts = pathUtil.splitNonEmpty(path)
    const list = parts ? operations.lsCached(this, parts) : null
    if (list === null) {
      throw new Error("Path does not exist")
    }
    return list
  }

  async mkdir(path: string): Promise<Tree> {
    const exists = await this.pathExists(path)
    if (exists) {
      throw new Error(`Path already exists: ${path}`)
    }
    const toAdd = await this.static.tree.empty(this.header.version)
    return this.addChild(path, toAdd)
  }

  async cat(path: string): Promise<FileContent> {
    const file = await this.get(path)
    if (file === null) {
      throw new Error("Path does not exist")
    } else if (!check.isFile(file)) {
      throw new Error('Can not `cat` a directory')
    }
    return file.content
  }

  async add(path: string, content: FileContent): Promise<Tree> {
    const file = this.static.file.create(content, this.header.version)
    return this.addChild(path, file)
  }

  async rm(path: string): Promise<Tree> {
    const parts = pathUtil.splitNonEmpty(path)
    if (parts === null) {
      throw new Error("Path does not exist")
    }
    return operations.rmNested(this, parts)
  }

  async pathExists(path: string): Promise<boolean> {
    const node = await this.get(path)
    return node !== null
  }

  async get(path: string): Promise<Tree | File | null> {
    const parts = pathUtil.splitNonEmpty(path)
    return parts ? operations.getCached(this, parts) : this
  }

  async addChild(path: string, toAdd: Tree | File): Promise<Tree> {
    const parts = pathUtil.splitNonEmpty(path)
    if (parts === null) {
      throw new Error("Path not specified")
    }
    const result = parts ? await operations.addRecurse(this, parts, toAdd) : this
    return result
  }

  async put(): Promise<CID> {
    return normalizer.putTree(this.header, null)
  }

  async updateDirectChild(child: Tree | File, name: string): Promise<Tree> {
    const cid = await child.put()
    return this.updateHeader(name, cid)
  }

  async removeDirectChild(name: string): Promise<Tree> {
    return this.updateHeader(name, null)
  }

  async getDirectChild(name: string): Promise<Tree | File | null> {
    const link = this.findLink(name)
    if (link === null) return null
    return link.isFile 
            ? this.static.file.fromCID(link.cid)
            : this.static.tree.fromCID(link.cid)
  }

  async getOrCreateDirectChild(name: string): Promise<Tree | File> {
    const child = await this.getDirectChild(name)
    return child ? child : this.static.tree.empty(this.header.version)
  }

  async updateHeader(name: string, childCID: Maybe<CID>): Promise<Tree> {
    const { cache } = this.header

    let childHeader = null, childCache = null
    if(isJust(childCID)){
      childHeader = await normalizer.getHeader(childCID, null)
      childCache = { ...childHeader, name, cid: childCID } 
    }

    const updatedCache = updateOrRemoveKeyFromObj(cache, name, childCache)
    const sizeDiff = (childHeader?.size || 0) - (cache[name]?.size || 0)

    // TODO: update links

    return this
      .copyWithHeader({
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
        [info.name]: info
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

  // copyWithLinks(links: Links): Tree {
  //   return new PublicTree(links, this.header)
  // }

  copyWithHeader(header: Header): Tree {
    return new PublicTree(header)
  }

  // pinList(): CID[] {
  //   return operations.pinMapToList(this.header.pins)
  // }

  getHeader(): Header {
    return this.header
  }

}

export default PublicTree
