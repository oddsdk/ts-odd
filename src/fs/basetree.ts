import operations from './operations'
import pathUtil from './path'
import { Link, Links, SimpleTree, Tree, StaticMethods, TreeStatic, FileStatic, File, SemVer, NodeInfo } from './types'
import check from './types/check'
import { CID, FileContent } from '../ipfs'
import { Maybe } from '../common'

abstract class BaseTree implements SimpleTree {

  version: SemVer
  links: Links

  constructor(version: SemVer, links: Links) {
    this.version = version
    this.links = links
  }

  async ls(path: string): Promise<Links> {
    const dir = await this.get(path)
    if (dir === null) {
      throw new Error("Path does not exist")
    } else if (check.isFile(dir)) {
      throw new Error('Can not `ls` a file')
    }
    return dir.links
  }

  async mkdir(path: string): Promise<SimpleTree> {
    const exists = await this.pathExists(path)
    if (exists) {
      throw new Error(`Path already exists: ${path}`)
    }
    const toAdd = await this.createEmptyTree()
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

  async add(path: string, content: FileContent): Promise<SimpleTree> {
    const file = this.createFile(content)
    return this.addChild(path, file)
  }

  async addChild(path: string, toAdd: SimpleTree | File): Promise<SimpleTree> {
    const parts = pathUtil.splitNonEmpty(path)
    if (parts === null) {
      throw new Error("Path not specified")
    }
    const result = parts ? await operations.addRecurse(this, parts, toAdd) : this
    return result
  }

  async rm(path: string): Promise<SimpleTree> {
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

  async get(path: string): Promise<SimpleTree | File | null> {
    const parts = pathUtil.splitNonEmpty(path)
    return parts ? operations.getRecurse(this, parts) : this
  }

  abstract async put(): Promise<CID>
  abstract async updateDirectChild(child: SimpleTree | File, name: string): Promise<SimpleTree>
  abstract async removeDirectChild(name: string): Promise<SimpleTree>
  abstract async getDirectChild(name: string): Promise<SimpleTree | File | null>
  abstract async getOrCreateDirectChild(name: string): Promise<SimpleTree | File>
  abstract async createEmptyTree(): Promise<SimpleTree>
  abstract async createTreeFromCID(cid: CID): Promise<SimpleTree>
  abstract createFile(content: FileContent): File
  abstract async createFileFromCID(cid: CID): Promise<File>
  // abstract async updateHeader(name: string, childInfo: Maybe<NodeInfo>): Promise<Tree>
  // abstract updateLink(info: Link): SimpleTree
  // abstract findLink(name: string): Link | null 
  // abstract findLinkCID(name: string): CID | null 
  // abstract rmLink(name: string): SimpleTree 
  // abstract copyWithLinks(links: Links): SimpleTree

}

export default BaseTree
