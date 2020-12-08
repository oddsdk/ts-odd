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
    const node = await this.get(from)
    if (node === null) {
      throw new Error(`Path does not exist: ${from}`)
    }

    let { tail, parentPath } = pathUtil.takeTail(to)
    parentPath = parentPath || ''

    if (tail === null) {
      throw new Error(`Path does not exist: ${to}`)
    }

    let parent = await this.get(parentPath)

    if (!parent) {
      await this.mkdir(parentPath)
      parent = await this.get(parentPath)
    } else if (check.isFile(parent)) {
      throw new Error(`Can not \`mv\` to a file: ${parentPath}`)
    }

    const toParts = pathUtil.splitParts(to)

    await this.rm(from)
    await [...toParts].reverse().reduce((acc, part, idx) => {
      return acc.then(async child => {
        const childParentParts = toParts.slice(0, -(idx + 1))
        const tree = childParentParts.length
          ? await this.get(pathUtil.join(childParentParts))
          : this

        if (tree && !check.isFile(tree)) {
          await tree.updateDirectChild(child, part, null)
          return tree
        } else {
          throw new Error("Failed to update tree while moving node")
        }
      })
    }, Promise.resolve(node))

    return this
  }

  async exists(path: string): Promise<boolean> {
    const node = await this.get(path)
    return node !== null
  }

  read(path: string): Promise<Tree | File | null> {
    return this.get(path)
  }

  write(path: string, content: FileContent): Promise<this> {
    return this.add(path, content)
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
