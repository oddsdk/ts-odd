import * as check from '../types/check'
import * as pathing from '../../path'

import { AddResult, CID, FileContent } from '../../ipfs/index'
import { Maybe } from '../../common/index'
import { Path } from '../../path'
import { SemVer } from '../semver'
import { Tree, File, UnixTree, BaseLinks, UpdateCallback } from '../types'


abstract class BaseTree implements Tree, UnixTree {

  version: SemVer

  constructor(version: SemVer) {
    this.version = version
  }

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async ls(path: Path): Promise<BaseLinks> {
    const dir = await this.get(path)
    if (dir === null) {
      throw new Error("Path does not exist")
    } else if (check.isFile(dir)) {
      throw new Error('Can not `ls` a file')
    }
    return dir.getLinks()
  }

  async cat(path: Path): Promise<FileContent> {
    const file = await this.get(path)
    if (file === null) {
      throw new Error("Path does not exist")
    } else if (!check.isFile(file)) {
      throw new Error('Can not `cat` a directory')
    }
    return file.content
  }

  async mkdir(path: Path): Promise<this> {
    return this.mkdirRecurse(path, () => this.put())
  }

  async mkdirRecurse(path: Path, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    const [ head, ...nextPath ] = path

    if (!head) {
      throw new Error("Invalid path: empty")
    }

    const child = await this.getOrCreateDirectChild(head, onUpdate)

    if (check.isFile(child)) {
      throw new Error(`There is a file along the given path: ${pathing.log(path)}`)
    }

    if (nextPath.length) {
      await child.mkdirRecurse(nextPath, () => this.updateDirectChild(child, head, onUpdate) )
    }

    return this
  }

  async add(path: Path, content: FileContent): Promise<this> {
    await this.addRecurse(path, content, () => this.put())
    return this
  }

  async addRecurse(path: Path, content: FileContent, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    const [ head, ...nextPath ] = path

    if (!head) {
      throw new Error("Invalid path: empty")
    }

    if (nextPath.length === 0) {
      await this.createOrUpdateChildFile(content, head, onUpdate)

    } else {
      const child = await this.getOrCreateDirectChild(head, onUpdate)
      if (check.isFile(child)) {
        throw new Error(`There is a file along the given path: ${pathing.log(path)}`)
      }
      await child.addRecurse(nextPath, content, async () => {
        await this.updateDirectChild(child, head, onUpdate)
      })

    }

    return this
  }

  async rm(path: Path): Promise<this> {
    await this.rmRecurse(path, () => this.put())
    return this
  }

  async rmRecurse(path: Path, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    const [ head, ...nextPath ] = path

    if (!head) {
      throw new Error("Invalid path: empty")
    }

    if (nextPath.length === 0) {
      this.removeDirectChild(head)
      onUpdate && await onUpdate()

    } else {
      const child = await this.getDirectChild(head)
      if (child === null) {
        throw new Error("Invalid path: does not exist")
      } else if(check.isFile(child)) {
        throw new Error(`There is a file along the given path: ${pathing.log(path)}`)
      }
      await child.rmRecurse(nextPath, async () => {
        await this.updateDirectChild(child, head, onUpdate)
      })

    }

    return this
  }

  async mv(from: Path, to: Path): Promise<this> {
    const node = await this.get(from)
    if (node === null) {
      throw new Error(`Path does not exist: ${pathing.log(from)}`)
    }

    if (to.length < 1) {
      throw new Error(`Path does not exist: ${pathing.log(to)}`)
    }

    const parentPath = to.slice(0, -1)
    let parent = await this.get(parentPath)

    if (!parent) {
      await this.mkdir(parentPath)
      parent = await this.get(parentPath)
    } else if (check.isFile(parent)) {
      throw new Error(`Can not \`mv\` to a file: ${pathing.log(parentPath)}`)
    }

    await this.rm(from)
    await [...to].reverse().reduce((acc, part, idx) => {
      return acc.then(async child => {
        const childParentParts = to.slice(0, -(idx + 1))
        const tree = childParentParts.length
          ? await this.get(childParentParts)
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

  async exists(path: Path): Promise<boolean> {
    const node = await this.get(path)
    return node !== null
  }

  read(path: Path): Promise<Tree | File | null> {
    return this.get(path)
  }

  write(path: Path, content: FileContent): Promise<this> {
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

  abstract get(path: Path): Promise<Tree | File | null>

  abstract updateLink(name: string, result: AddResult): this
  abstract getLinks(): BaseLinks
}


export default BaseTree
