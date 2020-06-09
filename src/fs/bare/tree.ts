import basic from '../normalizer/basic'
import { Link, Links, SimpleTree, SimpleFile } from '../types'
import check from '../types/check'
import { CID, FileContent } from '../../ipfs'
import { constructors as BareFileConstructors } from '../bare/file'
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

  async createEmptyTree(): Promise<BareTree> {
    return constructors.empty()
  }

  async createTreeFromCID(cid: CID): Promise<BareTree> {
    return constructors.fromCID(cid)
  }

  createFile(content: FileContent): SimpleFile {
    return BareFileConstructors.create(content)
  }

  async createFileFromCID(cid: CID): Promise<SimpleFile> {
    return BareFileConstructors.fromCID(cid)
  }

  async put(): Promise<CID> {
    const data = { links: this.links }
    return basic.putTree(data, null)
  }

  async updateDirectChild(child: SimpleTree | SimpleFile, name: string): Promise<this> {
    const cid = await child.put()
    const childLink = link.make(name, cid, check.isSimpleFile(child))
    
    return this.updateLink(childLink)
  }

  async removeDirectChild(name: string): Promise<this> {
    return this.rmLink(name)
  }

  async getDirectChild(name: string): Promise<SimpleTree | SimpleFile | null> {
    const link = this.findLink(name)
    if(link === null) return null
    return link.isFile
          ? this.createFileFromCID(link.cid)
          : this.createTreeFromCID(link.cid)
  }

  async getOrCreateDirectChild(name: string): Promise<SimpleTree | SimpleFile> {
    const child = await this.getDirectChild(name)
    return child ? child : this.createEmptyTree()
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

// CONSTRUCTORS

export const empty = async (): Promise<BareTree> => {
  return new BareTree({})
}

export const fromCID = async (cid: CID): Promise<BareTree> => {
  const links = await basic.getLinks(cid, null)
  return new BareTree(links) 
}

export const constructors = { empty, fromCID }


export default BareTree
