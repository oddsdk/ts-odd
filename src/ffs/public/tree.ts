import util from './util'
import pathUtil from '../path'
import link from '../link'
import { Link, Links, Tree, TreeStatic, FileStatic, File, FileSystemVersion } from '../types'
import { CID, FileContent } from '../../ipfs'
import PublicFile from './file'
import resolver from './resolver'

class PublicTree implements Tree {

  version: FileSystemVersion
  links: Links
  isFile = false
  static: {
    tree: TreeStatic
    file: FileStatic
  }

  constructor(links: Links, version: FileSystemVersion) {
    this.version = version
    this.links = links
    this.static = {
      tree: PublicTree,
      file: PublicFile
    }
  }

  static instanceOf(obj: any): obj is PublicTree {
    return obj.getDirectChild !== undefined
  }

  static async empty(version: FileSystemVersion = FileSystemVersion.v1_0_0): Promise<PublicTree> {
    return new PublicTree({}, version)
  }

  static async fromCID(cid: CID): Promise<PublicTree> {
    const version = await resolver.getVersion(cid)
    const links = await resolver.getLinks(cid)
    return new PublicTree(links, version)
  }

  async ls(path: string): Promise<Links> {
    const tree = await this.get(path)
    if(util.isFile(tree)) {
      throw new Error('Can not `ls` a file')
    }
    return tree.links
  }

  async mkdir(path: string): Promise<Tree> {
    const exists = await this.pathExists(path)
    if(exists) {
      throw new Error(`Path already exists: ${path}`)
    }
    const toAdd = await this.static.tree.empty(this.version)
    return this.addChild(path, toAdd)
  }

  async cat(path: string): Promise<FileContent> {
    const file = await this.get(path)
    if(!util.isFile(file)){
      throw new Error('Can not `cat` a directory')
    }
    return file.content
  }

  async add(path: string, content: FileContent): Promise<Tree> {
    const file = this.static.file.create(content, this.version)
    return this.addChild(path, file)
  }

  async pathExists(path: string): Promise<boolean> {
    try{
      await this.get(path)
      return true
    }catch(_err){
      return false

    }
  }

  async get(path: string): Promise<Tree | File> {
    return util.getRecurse(this, pathUtil.split(path))
  }

  async addChild(path: string, toAdd: Tree | File): Promise<Tree> {
    const parts = pathUtil.splitNonEmpty(path)
    return parts ? util.addRecurse(this, parts, toAdd) : this
  }

  async put(): Promise<CID> {
    return resolver.putTree(this.version, this.links)
  }

  async updateDirectChild(child: Tree | File, name: string): Promise<Tree> {
    const cid = await child.put()
    const isFile = util.isFile(child)
    return this.updateLink(link.make(name, cid, isFile))
  }

  async getDirectChild(name: string): Promise<Tree | File | null> {
    const link = this.findLink(name)
    if(link === null) {
      return null
    }
    return link.isFile ? this.static.file.fromCID(link.cid) : this.static.tree.fromCID(link.cid)
  }

  async getOrCreateDirectChild(name: string): Promise<Tree | File> {
    const child = await this.getDirectChild(name)
    return child ? child : this.static.tree.empty(this.version)
  }

  findLink(name: string): Link | null { 
    return this.links[name] || null
  }

  updateLink(link: Link): Tree { 
    return this.copyWithLinks({
      ...this.links,
      [link.name]: link
    })
  }

  rmLink(name: string): Tree { 
    delete this.links[name]
    return this.copyWithLinks(this.links)
  }

  copyWithLinks(links: Links): Tree {
    return new PublicTree(links, this.version)
  }
}

export default PublicTree
