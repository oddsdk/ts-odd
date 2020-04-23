import util from '../util'
import pathUtil from '../path'
import link from '../link'
import semver from '../semver'
import { Link, Links, Tree, TreeData, TreeStatic, FileStatic, File, SemVer } from '../types'
import { CID, FileContent } from '../../ipfs'
import PublicFile from './file'
import normalizer from '../normalizer'
import { rmKey } from '../../common'

class PublicTree implements Tree {

  version: SemVer
  links: Links
  isFile = false
  static: {
    tree: TreeStatic
    file: FileStatic
  }

  constructor(links: Links, version: SemVer) {
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

  static async empty(version: SemVer = semver.latest): Promise<PublicTree> {
    return new PublicTree({}, version)
  }

  static async fromCID(cid: CID): Promise<PublicTree> {
    const version = await normalizer.getVersion(cid)
    const { links }  = await normalizer.getTreeData(cid)
    return new PublicTree(links, version)
  }

  async ls(path: string): Promise<Links> {
    const tree = await this.get(path)
    if(tree === null){
      throw new Error("Path does not exist")
    } else if(util.isFile(tree)) {
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
    if(file === null){
      throw new Error("Path does not exist")
    } else if(!util.isFile(file)){
      throw new Error('Can not `cat` a directory')
    }
    return file.content
  }

  async add(path: string, content: FileContent): Promise<Tree> {
    const file = this.static.file.create(content, this.version)
    return this.addChild(path, file)
  }

  async rm(path: string): Promise<Tree> {
    const parts = pathUtil.splitNonEmpty(path)
    if(parts === null){
      throw new Error("Path does not exist")
    }
    return util.rmNested(this, parts)
  }

  async pathExists(path: string): Promise<boolean> {
    const node = await this.get(path)
    return node !== null
  }

  async get(path: string): Promise<Tree | File | null> {
    const parts = pathUtil.splitNonEmpty(path)
    return parts ? util.getRecurse(this, parts) : this
  }

  async addChild(path: string, toAdd: Tree | File): Promise<Tree> {
    const parts = pathUtil.splitNonEmpty(path)
    const result = parts ? await util.addRecurse(this, parts, toAdd) : this
    return result
  }

  async put(): Promise<CID> {
    return normalizer.putTree(this.version, this.data())
  }

  async updateDirectChild(child: Tree | File, name: string): Promise<Tree> {
    const cid = await child.put()
    const isFile = util.isFile(child)
    return this.updateLink(link.make(name, cid, isFile))
  }

  async removeDirectChild(name: string): Promise<Tree> {
    return this.rmLink(name)
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

  data(): TreeData {
    return { links: this.links }
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
    return this.copyWithLinks(rmKey(this.links, name))
  }

  copyWithLinks(links: Links): Tree {
    return new PublicTree(links, this.version)
  }

}

export default PublicTree
