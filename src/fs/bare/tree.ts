import * as protocol from '../protocol'
import { Links, Tree, File, Link, SyncHookDetailed, UnixTree, BaseLinks } from '../types'
import * as check from '../types/check'
import { AddResult, CID, FileContent } from '../../ipfs'
import BareFile from '../bare/file'
import BaseTree from '../base/tree'
import * as link from '../link'
import * as semver from '../semver'
import * as pathUtil from '../path'
import { Maybe } from '../../common'


class BareTree extends BaseTree implements UnixTree {

  links: Links
  onUpdate: Maybe<SyncHookDetailed> = null

  constructor(links: Links) {
    super(semver.v0)
    this.links = links
  }

  static async empty(): Promise<BareTree> {
    return new BareTree({})
  }

  static async fromCID(cid: CID): Promise<BareTree> {
    const links = await protocol.basic.getLinks(cid)
    return new BareTree(links) 
  }

  async emptyChildTree(): Promise<BareTree> {
    return BareTree.empty()
  }

  static fromLinks(links: Links): BareTree {
    return new BareTree(links) 
  }

  async createChildFile(content: FileContent): Promise<File> {
    return BareFile.create(content)
  }

  async putDetailed(): Promise<AddResult> {
    const details = await protocol.basic.putLinks(this.links)
    if(this.onUpdate !== null){
      this.onUpdate(details)
    }
    return details
  }

  async updateDirectChild(child: Tree | File, name: string): Promise<this> {
    const { cid, size } = await child.putDetailed()
    const childLink = link.make(name, cid, check.isFile(child), size)
    this.links[childLink.name] = childLink
    return this
  }

  removeDirectChild(name: string): this {
    delete this.links[name]
    return this
  }

  async getDirectChild(name: string): Promise<Tree | File | null> {
    const link = this.links[name] || null
    if(link === null) return null
    return link.isFile
          ? BareFile.fromCID(link.cid)
          : BareTree.fromCID(link.cid)
  }

  async getOrCreateDirectChild(name: string): Promise<Tree | File> {
    const child = await this.getDirectChild(name)
    return child ? child : this.emptyChildTree()
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

  updateLink(link: Link): Tree {
    this.links = {
      ...this.links,
      [link.name]: link
    }
    return this
  }

  getLinks(): BaseLinks {
    return this.links
  }
}


export default BareTree
