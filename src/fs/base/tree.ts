import type { CID } from "multiformats/cid"

import * as Check from "../types/check.js"
import * as Pathing from "../../path/index.js"

import { Maybe } from "../../common/index.js"
import { Segments as Path } from "../../path/index.js"
import { PutResult } from "../../components/depot/implementation.js"
import { Tree, File, UnixTree, Links, UpdateCallback } from "../types.js"


abstract class BaseTree implements Tree, UnixTree {

  readOnly: boolean

  constructor() {
    this.readOnly = false
  }

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async ls(path: Path): Promise<Links> {
    const dir = await this.get(path)
    if (dir === null) {
      throw new Error("Path does not exist")
    } else if (Check.isFile(dir)) {
      throw new Error("Can not `ls` a file")
    }
    return dir.getLinks()
  }

  async cat(path: Path): Promise<Uint8Array> {
    const file = await this.get(path)
    if (file === null) {
      throw new Error("Path does not exist")
    } else if (!Check.isFile(file)) {
      throw new Error("Can not `cat` a directory")
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

    if (Check.isFile(child)) {
      throw new Error(`There is a file along the given path: ${Pathing.log(path)}`)
    }

    if (nextPath.length) {
      await child.mkdirRecurse(nextPath, () => this.updateDirectChild(child, head, onUpdate))
    }

    return this
  }

  async add(path: Path, content: Uint8Array): Promise<this> {
    await this.addRecurse(path, content, () => this.put())
    return this
  }

  async addRecurse(path: Path, content: Uint8Array, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    const [ head, ...nextPath ] = path

    if (!head) {
      throw new Error("Invalid path: empty")
    }

    if (nextPath.length === 0) {
      await this.createOrUpdateChildFile(content, head, onUpdate)

    } else {
      const child = await this.getOrCreateDirectChild(head, onUpdate)
      if (Check.isFile(child)) {
        throw new Error(`There is a file along the given path: ${Pathing.log(path)}`)
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
      } else if (Check.isFile(child)) {
        throw new Error(`There is a file along the given path: ${Pathing.log(path)}`)
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
      throw new Error(`Path does not exist: ${Pathing.log(from)}`)
    }

    if (to.length < 1) {
      throw new Error(`Path does not exist: ${Pathing.log(to)}`)
    }

    const parentPath = to.slice(0, -1)
    let parent = await this.get(parentPath)

    if (!parent) {
      await this.mkdir(parentPath)
      parent = await this.get(parentPath)
    } else if (Check.isFile(parent)) {
      throw new Error(`Can not \`mv\` to a file: ${Pathing.log(parentPath)}`)
    }

    await this.rm(from)
    await [ ...to ].reverse().reduce((acc, part, idx) => {
      return acc.then(async child => {
        const childParentParts = to.slice(0, -(idx + 1))
        const tree = childParentParts.length
          ? await this.get(childParentParts)
          : this

        if (tree && !Check.isFile(tree)) {
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

  write(path: Path, content: Uint8Array): Promise<this> {
    return this.add(path, content)
  }

  async getOrCreateDirectChild(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree | File> {
    const node = await this.getDirectChild(name)
    return node !== null
      ? node
      : this.createChildTree(name, onUpdate)
  }

  /**
  * `put` is called on child (result of promise) in `updateDirectChild`
  * Then for the outermost parent, `put` should be called manually.
  */
  async updateChild(child: Tree | File, path: Path): Promise<this> {
    const chain: [ string, Tree ][] = []

    await path.reduce(async (promise: Promise<Tree>, p, idx) => {
      const parent = await promise
      chain.push([ p, parent ])

      if (idx + 1 === path.length) {
        return parent
      }

      const c = await parent.getDirectChild(p)

      if (!Check.isTree(c)) {
        const pathSoFar = path.slice(idx + 1)
        throw new Error(`Expected a tree at the given path: ${Pathing.log(pathSoFar)}`)
      }

      return c
    }, Promise.resolve(this))

    await chain.reverse().reduce(async (promise, [ name, parent ]) => {
      await parent.updateDirectChild(await promise, name, null)
      return parent
    }, Promise.resolve(child))

    return this
  }

  abstract createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree>
  abstract createOrUpdateChildFile(content: Uint8Array, name: string, onUpdate: Maybe<UpdateCallback>): Promise<File>

  abstract putDetailed(): Promise<PutResult>

  abstract updateDirectChild(child: Tree | File, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this>
  abstract removeDirectChild(name: string): this
  abstract getDirectChild(name: string): Promise<Tree | File | null>

  abstract get(path: Path): Promise<Tree | File | null>

  abstract updateLink(name: string, result: PutResult): this
  abstract getLinks(): Links
}


export default BaseTree
