import basic from '../network/basic'
import { Link, Links, Tree, File } from '../types'
import check from '../types/check'
import { CID, FileContent } from '../../ipfs'
import BareFile from '../bare/file'
import BaseTree from '../base/tree'
import { removeKeyFromObj } from '../../common'
import link from '../link'
import semver from '../semver'

class BareTree extends BaseTree {

  links: Links

  constructor(links: Links) {
    super(semver.v0)
    this.links = links
  }

  // why is this async? consistent interface? if so, maybe be explicit what we're implementing
  static async empty(): Promise<BareTree> {
    return new BareTree({}) // Why not just part of the constructor as a defautl value?
  }

  static async fromCID(cid: CID): Promise<BareTree> {
    const links = await basic.getLinks(cid, null)
    return new BareTree(links) 
  }

  async emptyChildTree(): Promise<BareTree> {
    return BareTree.empty()
  }

  async childTreeFromCID(cid: CID): Promise<BareTree> {
    return BareTree.fromCID(cid)
  }

  async createChildFile(content: FileContent): Promise<File> {
    return BareFile.create(content)
  }

  async childFileFromCID(cid: CID): Promise<File> {
    return BareFile.fromCID(cid)
  }

  async put(): Promise<CID> {
    return basic.putLinks(this.links, null)
  }

  async updateDirectChild(child: Tree | File, name: string): Promise<this> {
    const cid = await child.put()
    const childLink = link.make(name, cid, check.isFile(child))
    
    return this.updateLink(childLink)
  }

  async removeDirectChild(name: string): Promise<this> {
    return this.rmLink(name)
  }

  async getDirectChild(name: string): Promise<Tree | File | null> {
    const link = this.findLink(name)
    if(link === null) return null
    return link.isFile
          ? this.childFileFromCID(link.cid)
          : this.childTreeFromCID(link.cid)
  }

  async getOrCreateDirectChild(name: string): Promise<Tree | File> {
    const child = await this.getDirectChild(name)
    return child ? child : this.emptyChildTree()
  }

  updateLink(link: Link): this {
    this.links[link.name] = link
    return this
  }

  findLink(name: string): Link | null {
    return this.links[name] || null
  }

  findLinkCID(name: string): CID | null {
    return this.findLink(name)?.cid || null
  }

  rmLink(name: string): this {
    this.links = removeKeyFromObj(this.links, name)
    return this
  }

  getLinks(): Links {
    return this.links
  }
}

export default BareTree
