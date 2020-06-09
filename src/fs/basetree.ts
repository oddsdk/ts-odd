import operations from './operations'
import pathUtil from './path'
import { Links, SimpleTree, Tree, TreeStatic, FileStatic, File, SemVer, NodeInfo } from './types'
import check from './types/check'
import { CID, FileContent } from '../ipfs'
import { Maybe } from '../common'

type StaticMethods = {
  tree: TreeStatic
  file: FileStatic
}

abstract class BaseTree implements SimpleTree {

  static: StaticMethods
  version: SemVer
  links: Links

  constructor(staticMethods: StaticMethods, version: SemVer, links: Links) {
    this.static = staticMethods
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

  async mkdir(path: string): Promise<Tree> {
    const exists = await this.pathExists(path)
    if (exists) {
      throw new Error(`Path already exists: ${path}`)
    }
    const toAdd = await this.static.tree.empty(this.version)
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
    const file = this.static.file.create(content, this.version)
    return this.addChild(path, file)
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

  abstract async addChild(path: string, toAdd: Tree | File): Promise<Tree>
  abstract async put(): Promise<CID>
  abstract async updateDirectChild(child: Tree | File, name: string): Promise<Tree>
  abstract async removeDirectChild(name: string): Promise<Tree>
  abstract async getDirectChild(name: string): Promise<Tree | File | null>
  abstract async getOrCreateDirectChild(name: string): Promise<Tree | File>
  abstract async updateHeader(name: string, childInfo: Maybe<NodeInfo>): Promise<Tree>
  abstract updateLink(info: NodeInfo): Tree
  abstract findLink(name: string): NodeInfo | null 
  abstract findLinkCID(name: string): CID | null 
  abstract rmLink(name: string): Tree 
  abstract copyWithLinks(links: Links): Tree

}

export default BaseTree
