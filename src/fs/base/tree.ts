import pathUtil from '../path'
import { Links, SimpleTree, SimpleFile, SemVer, NonEmptyPath } from '../types'
import check from '../types/check'
import { CID, FileContent } from '../../ipfs'

abstract class BaseTree implements SimpleTree {

  version: SemVer

  constructor(version: SemVer) {
    this.version = version
  }

  async ls(path: string): Promise<Links> {
    const dir = await this.get(path)
    if (dir === null) {
      throw new Error("Path does not exist")
    } else if (check.isSimpleFile(dir)) {
      throw new Error('Can not `ls` a file')
    }
    return dir.getLinks()
  }

  async mkdir(path: string): Promise<this> {
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
    } else if (!check.isSimpleFile(file)) {
      throw new Error('Can not `cat` a directory')
    }
    return file.content
  }

  async add(path: string, content: FileContent): Promise<this> {
    const file = this.createFile(content)
    return this.addChild(path, file)
  }

  async addChild(path: string, toAdd: SimpleTree | SimpleFile): Promise<this> {
    const parts = pathUtil.splitNonEmpty(path)
    if (parts === null) {
      throw new Error("Path not specified")
    }
    const result = parts ? await this.addRecurse(parts, toAdd) : this
    return result
  }

  async addRecurse(path: NonEmptyPath, child: SimpleTree | SimpleFile): Promise<this> {
    const name = path[0]
    const nextPath = pathUtil.nextNonEmpty(path)

    let toAdd: SimpleTree | SimpleFile

    if (nextPath === null) {
      toAdd = child
    } else {
      const nextTree = await this.getOrCreateDirectChild(name)

      if (check.isSimpleFile(nextTree)) {
        throw new Error("Attempted to add a child to a File")
      }

      toAdd = await nextTree.addRecurse(nextPath, child)
    }

    return this.updateDirectChild(toAdd, name)
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

    if (node === null || check.isSimpleFile(node)) {
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

  async get(path: string): Promise<SimpleTree | SimpleFile | null> {
    const { head, nextPath } = pathUtil.takeHead(path)
    if(head === null) return this
    const nextTree = await this.getDirectChild(head)

    if (nextPath === null) {
      return nextTree
    } else if (nextTree === null || check.isSimpleFile(nextTree)) {
      return null
    }

    return nextTree.get(nextPath)
  }



  abstract async put(): Promise<CID>
  abstract async updateDirectChild (child: SimpleTree | SimpleFile, name: string): Promise<this>
  abstract async removeDirectChild(name: string): Promise<this>
  abstract async getDirectChild(name: string): Promise<SimpleTree | SimpleFile | null>
  abstract async getOrCreateDirectChild(name: string): Promise<SimpleTree | SimpleFile>

  abstract getLinks(): Links

  abstract async createEmptyTree(): Promise<SimpleTree>
  abstract async createTreeFromCID(cid: CID): Promise<SimpleTree>
  abstract createFile(content: FileContent): SimpleFile
  abstract async createFileFromCID(cid: CID): Promise<SimpleFile>
}

export default BaseTree
