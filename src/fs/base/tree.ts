/** @internal */

/** @internal */
import * as pathUtil from '../path'
import { Tree, File, UnixTree, BaseLinks, UpdateCallback } from '../types'
import { SemVer } from '../semver'
import * as check from '../types/check'
import { AddResult, CID, FileContent } from '../../ipfs'
import { Maybe } from '../../common'


abstract class BaseTree implements Tree, UnixTree {

  version: SemVer

  constructor(version: SemVer) {
    this.version = version
  }

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async ls(path: string): Promise<BaseLinks> {
    const dir = await this.get(path)
    if (dir === null) {
      throw new Error("Path does not exist")
    } else if (check.isFile(dir)) {
      throw new Error('Can not `ls` a file')
    }
    return dir.getLinks()
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

  async mkdir(path: string): Promise<this> {
    return this.mkdirRecurse(path, () => this.put())
  }

  async mkdirRecurse(path: string, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    const { head, nextPath } = pathUtil.takeHead(path)
    if(head === null){
      throw new Error("Invalid path: empty")
    }
    const child = await this.getOrCreateDirectChild(head, onUpdate)
    if (check.isFile(child)) {
      throw new Error(`There is a file along the given path: ${path}`)
    }
    if(nextPath !== null){
      await child.mkdirRecurse(nextPath, () => this.updateDirectChild(child, head, onUpdate) )
    }
    return this
  }

  async add(path: string, content: FileContent): Promise<this> {
    await this.addRecurse(path, content, () => this.put())
    return this
  }

  async addRecurse(path: string, content: FileContent, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    const { head, nextPath } = pathUtil.takeHead(path)
    if(head === null){
      throw new Error("Invalid path: empty")
    }
    if(nextPath === null) {
      await this.createOrUpdateChildFile(content, head, onUpdate)
    }else {
      const child = await this.getOrCreateDirectChild(head, onUpdate)
      if(check.isFile(child)) {
        throw new Error(`There is a file along the given path: ${path}`)
      }
      await child.addRecurse(nextPath, content, async () => {
        await this.updateDirectChild(child, head, onUpdate)
      })
    }
    return this
  }

  async rm(path: string): Promise<this> {
    await this.rmRecurse(path, () => this.put())
    return this
  }

  async rmRecurse(path: string, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    const { head, nextPath } = pathUtil.takeHead(path)
    if(head === null){
      throw new Error("Invalid path: empty")
    }
    if(nextPath === null) {
      this.removeDirectChild(head)
      onUpdate && await onUpdate()
    }else {
      const child = await this.getDirectChild(head)
      if(child === null) {
        throw new Error("Invalid path: does not exist")
      } else if(check.isFile(child)) {
        throw new Error(`There is a file along the given path: ${path}`)
      } 
      await child.rmRecurse(nextPath, async () => {
        await this.updateDirectChild(child, head, onUpdate)
      })
    }
    return this
  }

  async mv(from: string, to: string): Promise<this> {
    throw new Error("mv has been temporarily disabled")
    // const node = await this.get(from)
    // if (node === null) {
    //   throw new Error(`Path does not exist: ${from}`)
    // }
    // const { tail, parentPath } = pathUtil.takeTail(to)
    // if(tail === null){
    //   throw new Error(`Path does not exist: ${to}`)
    // }
    // const parent = await this.get(parentPath || '')
    // if (check.isFile(parent)) {
    //   throw new Error(`Can not \`mv\` to a file: ${parentPath || ''}`)
    // }

    // await this.updateDirectChild(node, tail, null)

    // return this.rm(from)
  }

  async exists(path: string): Promise<boolean> {
    const node = await this.get(path)
    return node !== null
  }

  async getOrCreateDirectChild(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree | File> {
    const node = await this.getDirectChild(name)
    return node !== null
      ? node
      : this.createChildTree(name, onUpdate)
  }

  abstract createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree>
  abstract createOrUpdateChildFile(content: FileContent, name: string, onUpdate: Maybe<UpdateCallback>): Promise<File>

  abstract putDetailed(): Promise<AddResult>

  abstract updateDirectChild (child: Tree | File, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this>
  abstract removeDirectChild(name: string): this
  abstract getDirectChild(name: string): Promise<Tree | File | null>

  abstract get(path: string): Promise<Tree | File | null>

  abstract updateLink(name: string, result: AddResult): this
  abstract getLinks(): BaseLinks
}


export default BaseTree
