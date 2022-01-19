import * as check from "../types/check.js"
import * as protocol from "../protocol/index.js"
import * as ipfs from "../../ipfs/index.js"
import * as link from "../link.js"

import { AddResult, CID, FileContent } from "../../ipfs/index.js"
import { HardLinks, BaseLinks, Tree, File, Puttable, UpdateCallback } from "../types.js"
import { Maybe } from "../../common/index.js"
import { Path } from "../../path.js"

import BareFile from "../bare/file.js"
import BaseTree from "../base/tree.js"


class BareTree extends BaseTree {

  links: HardLinks
  children: { [name: string]: Tree | File }

  constructor(links: HardLinks) {
    super()
    this.links = links
    this.children = {}
  }

  static async empty(): Promise<BareTree> {
    return new BareTree({})
  }

  static async fromCID(cid: CID): Promise<BareTree> {
    console.log("🍊", cid)
    const links = link.arrToMap(
      (await ipfs.ls(cid)).map(link.fromFSFile)
    )
    return new BareTree(links)
  }

  static fromLinks(links: HardLinks): BareTree {
    return new BareTree(links)
  }

  async createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree> {
    const child = await BareTree.empty()

    const existing = this.children[name]
    if (existing) {
      if (check.isFile(existing)) {
        throw new Error(`There is a file at the given path: ${name}`)
      }
      return existing
    }

    await this.updateDirectChild(child, name, onUpdate)
    return child
  }

  async createOrUpdateChildFile(content: FileContent, name: string, onUpdate: Maybe<UpdateCallback>): Promise<BareFile> {
    const existing = await this.getDirectChild(name)
    let file: BareFile
    if(existing === null){
      file = await BareFile.create(content)
    } else if (BareFile.instanceOf(existing)) {
      file = await existing.updateContent(content)
    }else {
      throw new Error(`There is already a directory with that name: ${name}`)
    }
    await this.updateDirectChild(file, name, onUpdate)
    return file
  }

  async putDetailed(): Promise<AddResult> {
    return protocol.basic.putLinks(this.links)
  }

  async putAndUpdateLink(child: Puttable, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    const details = await child.putDetailed()
    this.updateLink(name, details)
    onUpdate && await onUpdate()
    return this
  }

  async updateDirectChild(child: Tree | File, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    this.children[name] = child
    return this.putAndUpdateLink(child, name, onUpdate)
  }

  removeDirectChild(name: string): this {
    delete this.links[name]
    if(this.children[name]) {
      delete this.children[name]
    }
    return this
  }

  async getDirectChild(name: string): Promise<Tree | File | null> {
    if(this.children[name]) {
      return this.children[name]
    }

    const link = this.links[name] || null
    if(link === null) return null
    const child = link.isFile
      ? await BareFile.fromCID(link.cid)
      : await BareTree.fromCID(link.cid)

    // check that the child wasn't added while retrieving the content from the network
    if(this.children[name]) {
      return this.children[name]
    }

    this.children[name] = child
    return child
  }

  // TODO
  async get(path: Path): Promise<Tree | File | null> {
    const [ head, ...nextPath ] = path

    if (!head) return this
    const nextTree = await this.getDirectChild(head)

    if (!nextPath.length) {
      return nextTree
    } else if (nextTree === null || check.isFile(nextTree)) {
      return null
    }

    return nextTree.get(nextPath)
  }

  updateLink(name: string, result: AddResult): this {
    const { cid, size, isFile } = result
    this.links[name] = link.make(name, cid, isFile, size)
    return this
  }

  getLinks(): BaseLinks {
    return this.links
  }
}


export default BareTree
