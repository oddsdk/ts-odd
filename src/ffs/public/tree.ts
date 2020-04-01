import util from './util'
import pathUtil from '../path'
import { Link, Tree, TreeStatic } from '../types'
import ipfs, { CID, FileContent } from '../../ipfs'

class PublicTree implements Tree {

  links: Link[]
  static: TreeStatic

  constructor(links: Link[]) {
    this.links = links
    this.static = PublicTree
  }

  static instanceOf(obj: any): obj is PublicTree {
    return obj.getDirectChild !== undefined
  }

  static async empty(): Promise<PublicTree> {
    return new PublicTree([])
  }

  static async fromCID(cid: CID): Promise<PublicTree> {
    const links = await util.linksFromCID(cid)
    return new PublicTree(links)
  }

  static async fromContent(content: FileContent): Promise<Tree> {
    const cid = await ipfs.add(content)
    const dir = await PublicTree.empty()
    return dir.addLink({ name: 'index', cid })
  }

  async ls(path: string): Promise<Link[]> {
    const tree = await this.getTree(path)
    return tree ? tree.links : []
  }

  async mkdir(path: string): Promise<Tree> {
    const exists = await this.pathExists(path)
    if(exists) {
      throw new Error(`Path already exists: ${path}`)
    }
    const toAdd = await this.static.empty()
    return this.addChild(path, toAdd)
  }

  async cat(path: string): Promise<FileContent | null> {
    const tree = await this.getTree(path)
    return tree ? tree.getOwnContent() : null
  }

  async add(path: string, content: FileContent): Promise<Tree> {
    const toAdd = await this.static.fromContent(content)
    return this.addChild(path, toAdd)
  }

  async pathExists(path: string): Promise<boolean> {
    const tree = await this.getTree(path)
    return tree !== null
  }

  async getTree(path: string): Promise<Tree | null> {
    return util.getRecurse(this, pathUtil.split(path))
  }

  async addChild(path: string, toAdd: Tree): Promise<Tree> {
    const parts = pathUtil.splitNonEmpty(path)
    return parts ? util.addRecurse(this, parts, toAdd) : this
  }

  async put(): Promise<CID> {
    return util.putLinks(this.links)
  }

  async updateDirectChild(child: PublicTree, name: string): Promise<Tree> {
    const cid = await child.put()
    return this.replaceLink({ name, cid })
  }

  async getDirectChild(name: string): Promise<Tree | null> {
    const link = this.findLink(name)
    return link ? this.static.fromCID(link.cid) : null
  }

  async getOrCreateDirectChild(name: string): Promise<Tree> {
    const child = await this.getDirectChild(name)
    return child ? child : this.static.empty()
  }

  async getOwnContent(): Promise<FileContent | null> {
    const link = this.findLink('index')
    return link ? ipfs.catBuf(link.cid) : null
  }

  isFile(): boolean { 
    return this.findLink('index') !== null
  }

  findLink(name: string): Link | null { 
    return this.links.find(l => l.name === name ) || null
  }

  addLink(link: Link): Tree { 
    return this.copyWithLinks([...this.links, link])
  }

  rmLink(name: string): Tree { 
    const filtered = this.links.filter(l => l.name !== name)
    return this.copyWithLinks(filtered)
  }

  replaceLink(link: Link): Tree { 
    return this.rmLink(link.name).addLink(link)
  }

  copyWithLinks(links: Link[]): Tree {
    return new PublicTree(links)
  }
}

export default PublicTree
