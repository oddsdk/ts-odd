import basic from '../normalizer/basic'
import { Link, Links, SimpleTree, File } from '../types'
import check from '../types/check'
import { CID, FileContent } from '../../ipfs'
import { constructors as PublicFileConstructors } from '../public/file'
import BaseTree from '../basetree'
import { removeKeyFromObj } from '../../common'
import link from '../link'
import semver from '../semver'

class PublicTreeBare extends BaseTree implements SimpleTree {

  constructor(links: Links) {
    super(semver.v0, links)
  }

  async createEmptyTree(): Promise<PublicTreeBare> {
    return constructors.empty()
  }

  async createTreeFromCID(cid: CID): Promise<PublicTreeBare> {
    return constructors.fromCID(cid)
  }

  createFile(content: FileContent): File {
    return PublicFileConstructors.create(content, semver.v0)
  }

  async createFileFromCID(cid: CID): Promise<File> {
    return PublicFileConstructors.fromCID(cid)
  }

  async put(): Promise<CID> {
    const data = { links: this.links }
    return basic.putTree(data, null)
  }

  async updateDirectChild(child: SimpleTree | File, name: string): Promise<SimpleTree> {
    const cid = await child.put()
    const childLink = link.make(name, cid, check.isFile(child))
    
    return this.updateLink(childLink)
  }

  async removeDirectChild(name: string): Promise<SimpleTree> {
    return this.rmLink(name)
  }

  async getDirectChild(name: string): Promise<SimpleTree | File | null> {
    const link = this.findLink(name)
    if(link === null) return null
    return link.isFile
          ? this.createFileFromCID(link.cid)
          : this.createTreeFromCID(link.cid)
  }

  async getOrCreateDirectChild(name: string): Promise<SimpleTree | File> {
    const child = await this.getDirectChild(name)
    return child ? child : this.createEmptyTree()
  }

  updateLink(link: Link): SimpleTree {
    return this.copyWithLinks({
      ...this.links,
      [link.name]: link
    })
  }

  findLink(name: string): Link | null {
    return this.links[name] || null
  }

  findLinkCID(name: string): CID | null {
    return this.findLink(name)?.cid || null
  }

  rmLink(name: string): SimpleTree {
    const updated = removeKeyFromObj(this.links, name)
    return this.copyWithLinks(updated)
  }

  copyWithLinks(links: Links): SimpleTree {
    return new PublicTreeBare(links)
  }
}

export const empty = async (): Promise<PublicTreeBare> => {
  return new PublicTreeBare({})
}

export const fromCID = async (cid: CID): Promise<PublicTreeBare> => {
  const links = await basic.getLinks(cid, null)
  return new PublicTreeBare(links) 
}

export const constructors = { empty, fromCID }


export default PublicTreeBare
