import pathUtil from '../path'
import { Links, Tree, File, SemVer, NonEmptyPath } from '../types'
import check from '../types/check'
import { CID, FileContent } from '../../ipfs'

abstract class BaseTree implements Tree {

  version: SemVer

  constructor(version: SemVer) {
    this.version = version
  }

  async ls(path: string): Promise<Links> {
    const dir = await this.get(path)
    if (dir === null) {
      throw new Error("Path does not exist")
    } else if (check.isFile(dir)) {
      throw new Error('Can not `ls` a file')
    }
    return dir.getLinks()
  }

  async mkdir(path: string): Promise<this> {
    const exists = await this.pathExists(path)
    if (exists) {
      throw new Error(`Path already exists: ${path}`)
    }
    const toAdd = await this.emptyChildTree()
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

  async add(path: string, content: FileContent): Promise<this> {
    return this.addChild(path, content)
  }

  async addChild(path: string, toAdd: Tree | FileContent): Promise<this> {
    const parts = pathUtil.splitNonEmpty(path)
    if (parts === null) {
      throw new Error("Path not specified")
    }
    const result = parts ? await this.addRecurse(parts, toAdd) : this
    return result
  }

  async addRecurse(path: NonEmptyPath, child: Tree | FileContent): Promise<this> {
    const name = path[0]
    const nextPath = pathUtil.nextNonEmpty(path)

    let toAdd: Tree | FileContent

    if (nextPath === null) {
      toAdd = child
    } else {
      const nextTree = await this.getOrCreateDirectChild(name)

      if (check.isFile(nextTree)) {
        throw new Error("Attempted to add a child to a File")
      }

      toAdd = await nextTree.addRecurse(nextPath, child)
    }

    const toAddNode = check.isTree(toAdd) ? toAdd : await this.createChildFile(child)

    return this.updateDirectChild(toAddNode, name)
  }

  async rm(path: string): Promise<this> {
    const parts = pathUtil.splitNonEmpty(path)
    if (parts === null) {
      throw new Error("Path does not exist")
    }
    return this.rmNested(parts)
  }

  async rmNested(path: NonEmptyPath): Promise<this> {
    const filename = path[path.length - 1]
    const parentPath = path.slice(0, path.length - 1)
    const node = await this.get(pathUtil.join(parentPath))

    if (node === null || check.isFile(node)) {
      throw new Error("Path does not exist")
    }

    const updated = await node.removeDirectChild(filename)
    return parentPath.length > 0
            ? this.addChild(pathUtil.join(parentPath), updated)
            : updated as this
  }

  async pathExists(path: string): Promise<boolean> {
    const node = await this.get(path)
    return node !== null
  }

  async get(path: string): Promise<Tree | File | null> {
    const { head, nextPath } = pathUtil.takeHead(path)
    if(head === null) return this
    const nextTree = await this.getDirectChild(head)

    if (nextPath === null) {
      return nextTree
    } else if (nextTree === null || check.isFile(nextTree)) {
      return null
    }

    return nextTree.get(nextPath)
  }



  abstract async put(): Promise<CID>
  abstract async updateDirectChild (child: Tree | File, name: string): Promise<this>
  abstract async removeDirectChild(name: string): Promise<this>
  abstract async getDirectChild(name: string): Promise<Tree | File | null>
  abstract async getOrCreateDirectChild(name: string): Promise<Tree | File>

  abstract getLinks(): Links

  abstract async emptyChildTree(): Promise<Tree>
  abstract async childTreeFromCID(cid: CID): Promise<Tree>
  abstract async createChildFile(content: FileContent): Promise<File>
  abstract async childFileFromCID(cid: CID): Promise<File>
}

export default BaseTree
