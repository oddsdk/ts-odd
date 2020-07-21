import * as protocol from '../protocol'
import * as header from './header'
import { Links, HeaderV1, StaticMethods, HeaderTree, HeaderFile, PutDetails, SyncHookDetailed } from '../types'
import * as check from '../types/check'
import { CID, FileContent } from '../../ipfs'
import BaseTree from '../base/tree'
import PublicFile from './PublicFile'
import { Maybe } from '../../common'
import * as link from '../link'
import * as semver from '../semver'
import * as skeleton from '../skeleton'
import * as pathUtil from '../path'

export class PublicTree extends BaseTree implements HeaderTree {

  protected header: HeaderV1
  parentKey: Maybe<string> // @@TODO: this is no good to have this non-protected, but we're refactoring the private side now any
  protected ownKey: Maybe<string> = null
  onUpdate: Maybe<SyncHookDetailed> = null

  protected static: StaticMethods

  constructor(links: Links, header: HeaderV1, parentKey: Maybe<string>) {
    super(links, header.version)
    this.parentKey = parentKey
    this.header = header
    this.static = {
      tree: PublicTree,
      file: PublicFile
    }
  }

  static async empty (parentKey: Maybe<string>): Promise<PublicTree> {
    return new PublicTree({}, {
      ...header.empty(),
      version: semver.v1,
    }, parentKey)
  }

  static async fromCID (cid: CID, parentKey: Maybe<string>): Promise<PublicTree> {
    const info = await header.getHeaderAndUserland(cid, null)
    return PublicTree.fromHeaderAndUserland(info.header, info.userland, parentKey)
  }

  static async fromHeaderAndUserland(header: HeaderV1, userland: CID, parentKey: Maybe<string>): Promise<PublicTree> {
    const links = await protocol.getLinks(userland, header.key)
    return new PublicTree(links, header, parentKey)
  }

  static instanceOf(obj: any): obj is PublicTree {
    return obj.header !== undefined
  }

  async emptyChildTree(): Promise<HeaderTree> {
    return this.static.tree.empty(this.ownKey)
  }

  async createChildFile(content: FileContent): Promise<HeaderFile> {
    return this.static.file.create(content, this.ownKey)
  }

  async putDetailed(): Promise<PutDetails> {
    return this.putWithKey(this.parentKey)
  }
  
  protected async putWithKey(key: Maybe<string>): Promise<PutDetails> {
    const { cid, size } = await protocol.putLinks(this.links, this.header.key)
    const userlandLink = link.make('userland', cid, true, size)
    const details = await header.put(userlandLink, {
      ...this.header,
      mtime: Date.now()
    }, key)
    if(this.onUpdate !== null){
      this.onUpdate(details)
    }
    return details
  }

  async updateDirectChild(child: HeaderTree | HeaderFile, name: string): Promise<this> {
    child.parentKey = this.ownKey //@@TODO: this is kinda hacky, but we're totally redoing the private side soon
    const { cid, metadata, userland, size } = await child.putDetailed()
    const childHeader = child.getHeader()
    this.links[name] = link.make(name, cid, check.isFile(child), size)
    this.header.skeleton[name] = { cid, metadata, userland, children: childHeader.skeleton, key: this.ownKey }
    this.header.children[name] = header.toMetadata(childHeader)
    return this
  }

  async removeDirectChild(name: string): Promise<this> {
    delete this.links[name]
    delete this.header.skeleton[name]
    return this
  }

  async getDirectChild(name: string): Promise<HeaderTree | HeaderFile | null> {
    const childCID = this.header.skeleton[name]?.cid || null
    const childInfo = this.header.children[name] || null
    if(childCID === null || childInfo === null) return null
    return childInfo.isFile
          ? this.static.file.fromCID(childCID, this.ownKey)
          : this.static.tree.fromCID(childCID, this.ownKey)
  }

  async getOrCreateDirectChild(name: string): Promise<HeaderTree | HeaderFile> {
    const child = await this.getDirectChild(name)
    return child ? child : this.emptyChildTree()
  }

  async get(path: string): Promise<HeaderTree | HeaderFile | null> {
    const parts = pathUtil.splitNonEmpty(path)
    if(parts === null) return this

    const skeletonInfo = skeleton.getPath(this.header.skeleton, parts)
    if(skeletonInfo === null) return null

    const { cid, key } = skeletonInfo
    const info = await header.getHeaderAndUserland(cid, key)
    return info.header.isFile 
      ? this.static.file.fromHeaderAndUserland(info.header, info.userland, key)
      : this.static.tree.fromHeaderAndUserland(info.header, info.userland, key)
  }

  getLinks(): Links {
    // add missing metadata into links
    return Object.values(this.links).reduce((acc, cur) => {
      return {
        ...acc,
        [cur.name]: {
          ...cur,
          mtime: this.header.children[cur.name]?.mtime,
          isFile: this.header.children[cur.name]?.isFile,
        }
      }
    }, {} as Links)
  }

  getHeader(): HeaderV1 {
    return this.header
  }

}


export default PublicTree
