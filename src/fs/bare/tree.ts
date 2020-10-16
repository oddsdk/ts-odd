import * as protocol from '../protocol'
import { Links, BaseLinks, Tree, File, Puttable, UpdateCallback } from '../types'
import * as check from '../types/check'
import { AddResult, CID, FileContent } from '../../ipfs'
import BareFile from '../bare/file'
import BaseTree from '../base/tree'
import * as link from '../link'
import * as semver from '../semver'
import * as pathUtil from '../path'
import { Maybe } from '../../common'


class BareTree extends BaseTree {

  links: Links
  children: { [name: string]: Tree | File }

  constructor(links: Links) {
    super(semver.v0)
    this.links = links
    this.children = {}
  }

  static async empty(): Promise<BareTree> {
    return new BareTree({})
  }

  static async fromCID(cid: CID): Promise<BareTree> {
    const links = await protocol.basic.getLinks(cid)
    return new BareTree(links) 
  }

  static fromLinks(links: Links): BareTree {
    return new BareTree(links) 
  }

  async createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree> {
    const child = await BareTree.empty()

    const existing = this.children[name]
    if(existing) {
      if(BareFile.instanceOf(existing)) {
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
